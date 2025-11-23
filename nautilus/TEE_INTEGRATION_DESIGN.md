# Nautilus TEE Integration Design

## 概述

本文档描述如何将 Nautilus TEE KPI 计算器集成到 M&A Earn-out dApp 中，确保 KPI 计算的可信度和可验证性。

## 架构设计

```
┌─────────────┐     解密数据      ┌──────────────┐     计算请求     ┌────────────────┐
│  Frontend   │ ───────────────> │   Nautilus   │ <──────────────> │   KPI TEE      │
│  (Browser)  │                  │   TEE SDK    │                  │   Calculator   │
└─────────────┘                  └──────────────┘                  └────────────────┘
      │                                 │                                  │
      │ Submit KPI Result               │                                  │
      ▼                                 │                                  ▼
┌─────────────┐                         │                          返回 KPIResult +
│  Sui Move   │ <───────────────────────┘                          Attestation
│  Contract   │     验证 Attestation
└─────────────┘
```

## 完整流程

### Phase 1: 文档上传与审计（已实现）

1. **Buyer** 加密财务文档并上传到 Walrus
2. **Buyer** 调用 `add_walrus_blob()` 注册 blob ID 到链上
3. **Auditor** 下载加密文档，使用 Seal 解密并验证
4. **Auditor** 调用 `audit_data()` 标记文档已审计

### Phase 2: KPI 计算与 TEE Attestation（需实现）

#### 2.1 客户端准备数据

```typescript
// Frontend: 下载并解密所有 subperiod 的财务文档
const allDocuments = [];
for (const subperiod of deal.subperiods) {
  for (const blob of subperiod.walrus_blobs) {
    // 1. 从 Walrus 下载 ciphertext
    const ciphertext = await walrusClient.download(blob.blob_id);

    // 2. 使用 Seal 解密（已有权限检查）
    const plaintext = await sealClient.decrypt({
      ciphertext,
      dealId: deal.id,
      userAddress: currentUserAddress
    });

    allDocuments.push(JSON.parse(plaintext));
  }
}
```

#### 2.2 调用 Nautilus TEE 计算 KPI

```typescript
// Frontend: 调用 Nautilus TEE SDK
import { NautilusTEE } from '@nautilus/sdk'; // 假设的 SDK 名称

// 初始化 TEE client
const teeClient = new NautilusTEE({
  teeEndpoint: process.env.NEXT_PUBLIC_NAUTILUS_TEE_ENDPOINT,
  programId: 'kpi_calculator_v1' // TEE 程序标识符
});

// 调用 TEE 计算
const teeResult = await teeClient.compute({
  documents: allDocuments,
  initialKPI: 0,
  // TEE 会验证输入数据的完整性
});

// teeResult 结构：
// {
//   kpiResult: {
//     kpi: 150000,
//     change: 150000,
//     file_type: "JournalEntry" // 最后一个处理的文件类型
//   },
//   attestation: Uint8Array([...]), // TEE 签名的 attestation
//   computationProof: {
//     timestamp: 1700000000000,
//     teePublicKey: "0x...",
//     signature: "0x..."
//   }
// }
```

#### 2.3 Attestation 结构设计

Nautilus TEE 返回的 attestation 应包含：

```rust
// Nautilus TEE 内部 (kpi_calculator.rs 扩展)
pub struct TEEAttestation {
    pub kpi_value: u64,           // 计算出的 KPI 值
    pub computation_hash: [u8; 32], // 输入数据的哈希
    pub timestamp: u64,           // TEE 时间戳
    pub tee_public_key: [u8; 32], // TEE 的公钥
    pub signature: [u8; 64],      // TEE 对上述数据的签名
}

// 序列化为 bytes 后传给 Move 合约
impl TEEAttestation {
    pub fn to_bytes(&self) -> Vec<u8> {
        // 固定格式序列化：
        // [kpi_value: 8 bytes][hash: 32 bytes][timestamp: 8 bytes]
        // [public_key: 32 bytes][signature: 64 bytes]
        // 总共 144 bytes
        let mut bytes = Vec::with_capacity(144);
        bytes.extend_from_slice(&self.kpi_value.to_le_bytes());
        bytes.extend_from_slice(&self.computation_hash);
        bytes.extend_from_slice(&self.timestamp.to_le_bytes());
        bytes.extend_from_slice(&self.tee_public_key);
        bytes.extend_from_slice(&self.signature);
        bytes
    }
}
```

#### 2.4 前端提交 KPI 到链上

```typescript
// Frontend: 提交 KPI result 到 Sui 合约
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

const { mutate: signAndExecute } = useSignAndExecuteTransaction();

// 构造交易
const txb = new TransactionBlock();
txb.moveCall({
  target: `${EARNOUT_PACKAGE_ID}::earnout::submit_kpi_and_settle`,
  arguments: [
    txb.object(dealId),
    txb.pure("net_profit"), // kpi_type
    txb.pure(teeResult.kpiResult.kpi), // kpi_value
    txb.pure(Array.from(teeResult.attestation)), // attestation bytes
    txb.object(paymentCoinId), // payment coin
    txb.object('0x6'), // clock
  ],
});

// 用户签名并执行
await signAndExecute({ transaction: txb });
```

### Phase 3: 链上验证 Attestation（需实现）

#### 3.1 Move 合约验证逻辑

```move
// earnout.move 更新 verify_nautilus_attestation 函数

/// Verify Nautilus TEE attestation
///
/// Attestation format (144 bytes total):
/// - kpi_value: u64 (8 bytes, little-endian)
/// - computation_hash: 32 bytes
/// - timestamp: u64 (8 bytes, little-endian)
/// - tee_public_key: 32 bytes
/// - signature: 64 bytes (Ed25519)
///
/// Verification steps:
/// 1. Check attestation length (must be 144 bytes)
/// 2. Extract kpi_value and verify it matches expected_kpi_value
/// 3. Extract tee_public_key and verify it's in the trusted TEE registry
/// 4. Verify Ed25519 signature over (kpi_value || computation_hash || timestamp)
public fun verify_nautilus_attestation(
    attestation: &vector<u8>,
    expected_kpi_value: u64,
): bool {
    // 1. Check length
    let attestation_length = vector::length(attestation);
    if (attestation_length != 144) {
        return false
    };

    // 2. Extract kpi_value (first 8 bytes, little-endian)
    let kpi_bytes = vector::empty<u8>();
    let mut i = 0;
    while (i < 8) {
        vector::push_back(&mut kpi_bytes, *vector::borrow(attestation, i));
        i = i + 1;
    };
    let kpi_value = bytes_to_u64_le(&kpi_bytes);

    if (kpi_value != expected_kpi_value) {
        return false
    };

    // 3. Extract computation_hash (bytes 8-39)
    let mut computation_hash = vector::empty<u8>();
    i = 8;
    while (i < 40) {
        vector::push_back(&mut computation_hash, *vector::borrow(attestation, i));
        i = i + 1;
    };

    // 4. Extract timestamp (bytes 40-47)
    let mut timestamp_bytes = vector::empty<u8>();
    i = 40;
    while (i < 48) {
        vector::push_back(&mut timestamp_bytes, *vector::borrow(attestation, i));
        i = i + 1;
    };
    let _timestamp = bytes_to_u64_le(&timestamp_bytes);

    // 5. Extract tee_public_key (bytes 48-79)
    let mut tee_public_key = vector::empty<u8>();
    i = 48;
    while (i < 80) {
        vector::push_back(&mut tee_public_key, *vector::borrow(attestation, i));
        i = i + 1;
    };

    // 6. Verify TEE public key is in trusted registry
    // TODO: Implement trusted TEE registry check
    // For now, accept any TEE key

    // 7. Extract signature (bytes 80-143)
    let mut signature = vector::empty<u8>();
    i = 80;
    while (i < 144) {
        vector::push_back(&mut signature, *vector::borrow(attestation, i));
        i = i + 1;
    };

    // 8. Verify Ed25519 signature
    // Message = kpi_value || computation_hash || timestamp
    let mut message = vector::empty<u8>();
    vector::append(&mut message, kpi_bytes);
    vector::append(&mut message, computation_hash);
    vector::append(&mut message, timestamp_bytes);

    // Use sui::ed25519::ed25519_verify
    let is_valid = sui::ed25519::ed25519_verify(&signature, &tee_public_key, &message);

    is_valid
}

/// Helper: Convert 8 bytes (little-endian) to u64
fun bytes_to_u64_le(bytes: &vector<u8>): u64 {
    let mut result: u64 = 0;
    let mut i = 0;
    while (i < 8) {
        let byte = (*vector::borrow(bytes, i) as u64);
        result = result + (byte << ((i * 8) as u8));
        i = i + 1;
    };
    result
}
```

#### 3.2 添加 TEE Registry（可选的增强安全性）

为了防止恶意 TEE 节点，可以添加可信 TEE 公钥注册表：

```move
// 在 earnout.move 中添加

/// Trusted TEE Registry for whitelisting authorized TEE nodes
public struct TEERegistry has key {
    id: UID,
    admin: address,
    trusted_public_keys: vector<vector<u8>>, // List of trusted TEE public keys
}

/// Initialize TEE Registry (called once during deployment)
public fun init_tee_registry(ctx: &mut TxContext) {
    let registry = TEERegistry {
        id: object::new(ctx),
        admin: tx_context::sender(ctx),
        trusted_public_keys: vector::empty(),
    };
    transfer::share_object(registry);
}

/// Add a trusted TEE public key (admin only)
public fun add_trusted_tee(
    registry: &mut TEERegistry,
    tee_public_key: vector<u8>,
    ctx: &TxContext
) {
    assert!(tx_context::sender(ctx) == registry.admin, ENotAuthorized);
    assert!(vector::length(&tee_public_key) == 32, EMismatchLength);
    vector::push_back(&mut registry.trusted_public_keys, tee_public_key);
}

/// Check if TEE public key is trusted
fun is_tee_trusted(registry: &TEERegistry, tee_public_key: &vector<u8>): bool {
    let len = vector::length(&registry.trusted_public_keys);
    let mut i = 0;
    while (i < len) {
        let trusted_key = vector::borrow(&registry.trusted_public_keys, i);
        if (keys_equal(trusted_key, tee_public_key)) {
            return true
        };
        i = i + 1;
    };
    false
}

/// Helper: Compare two public keys
fun keys_equal(key1: &vector<u8>, key2: &vector<u8>): bool {
    if (vector::length(key1) != vector::length(key2)) {
        return false
    };
    let len = vector::length(key1);
    let mut i = 0;
    while (i < len) {
        if (*vector::borrow(key1, i) != *vector::borrow(key2, i)) {
            return false
        };
        i = i + 1;
    };
    true
}
```

然后在 `verify_nautilus_attestation` 中添加注册表检查：

```move
public fun verify_nautilus_attestation(
    attestation: &vector<u8>,
    expected_kpi_value: u64,
    tee_registry: &TEERegistry, // 新增参数
): bool {
    // ... [前面的验证步骤]

    // 6. Verify TEE public key is in trusted registry
    if (!is_tee_trusted(tee_registry, &tee_public_key)) {
        return false
    };

    // ... [继续签名验证]
}
```

## 实现步骤

### Step 1: 准备 Nautilus TEE 环境

1. **部署 kpi_calculator.rs 到 Nautilus TEE**
   ```bash
   # 假设的 Nautilus CLI 命令
   nautilus deploy --program kpi_calculator.rs --name kpi_calculator_v1
   ```

2. **获取 TEE 程序 ID 和公钥**
   ```bash
   nautilus info --program kpi_calculator_v1
   # 输出: Program ID: kpi_calculator_v1
   #      Public Key: 0x1234...
   ```

### Step 2: 更新 Move 合约

1. **添加 Ed25519 验证依赖**
   ```toml
   # Move.toml
   [dependencies]
   Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
   ```

2. **更新 earnout.move**
   - 实现 `verify_nautilus_attestation` 完整验证逻辑
   - 可选：添加 `TEERegistry` 管理可信 TEE

3. **部署更新后的合约**
   ```bash
   sui client publish --gas-budget 100000000
   ```

### Step 3: 前端集成

1. **安装 Nautilus SDK**
   ```bash
   npm install @nautilus/sdk  # 假设的包名
   ```

2. **创建 TEE Service**
   ```typescript
   // src/frontend/services/tee-service.ts
   export class TEEService {
     async computeKPI(documents: any[]): Promise<TEEResult> {
       // 调用 Nautilus TEE
     }
   }
   ```

3. **创建 Settlement UI 组件**
   - 下载并解密所有文档
   - 调用 TEE 计算 KPI
   - 提交结果到链上

### Step 4: 测试流程

1. **本地测试 TEE 计算器**
   ```bash
   cargo test --manifest-path nautilus/Cargo.toml
   ```

2. **集成测试**
   - 创建测试 Deal
   - 上传测试财务文档
   - 调用 TEE 计算
   - 验证 Attestation

## 安全考虑

### 1. TEE 可信度
- **问题**: 如何确保 TEE 节点没有被篡改？
- **解决**:
  - 使用 Nautilus 提供的远程证明（Remote Attestation）
  - 维护可信 TEE 公钥白名单（TEERegistry）
  - 定期轮换 TEE 节点

### 2. 数据完整性
- **问题**: 如何防止用户提交篡改的文档到 TEE？
- **解决**:
  - TEE 计算时验证文档来源于 Walrus blob ID
  - 在 attestation 中包含 computation_hash（输入数据的哈希）
  - 链上可以验证 blob_id 是否已注册

### 3. 重放攻击
- **问题**: 攻击者能否重复使用旧的 attestation？
- **解决**:
  - Attestation 包含 timestamp
  - Move 合约检查 timestamp 在合理范围内
  - 每个 Deal 只能提交一次 KPI result

### 4. 前端信任问题
- **问题**: 用户的浏览器可能被攻击，发送错误数据到 TEE
- **解决**:
  - TEE 独立验证所有输入数据
  - Auditor 可以独立重新计算 KPI 验证
  - 所有数据来源都记录在链上（可追溯）

## 限制与未来改进

### 当前限制

1. **TEE Registry 管理**：目前需要手动添加可信 TEE 公钥
2. **单一 KPI 计算器**：只支持一种计算逻辑
3. **无法验证 Walrus blob 来源**：理论上用户可以提交链外数据

### 未来改进

1. **去中心化 TEE 网络**
   - 多个 TEE 节点并行计算
   - 共识机制验证结果

2. **灵活的 KPI 公式**
   - 支持自定义 KPI 计算公式
   - 在创建 Deal 时指定计算逻辑

3. **增强的数据溯源**
   - TEE 直接从 Walrus 下载 blob
   - 验证 blob_id 在链上已注册

4. **零知识证明集成**
   - 使用 ZK-SNARK 证明计算正确性
   - 无需暴露原始财务数据

## 示例代码参考

详细的实现代码请参考：

- Frontend TEE 集成: `src/frontend/services/tee-service.ts`
- Move 合约更新: `src/backend/contracts/sources/earnout.move`
- Nautilus TEE 代码: `nautilus/kpi_calculator.rs`

## FAQ

### Q1: Nautilus TEE 如何保证计算不被篡改？

Nautilus TEE 运行在隔离的可信执行环境（SGX/TrustZone 等）中，操作系统和其他应用无法访问 TEE 内部状态。TEE 使用硬件密钥签名计算结果，任何篡改都会导致签名验证失败。

### Q2: 如果 TEE 节点下线怎么办？

方案 A（当前设计）：前端可以调用任何可信的 TEE 节点（通过 TEERegistry 验证）。
方案 B（未来改进）：部署去中心化 TEE 网络，自动故障转移。

### Q3: 为什么不直接在前端计算 KPI？

前端计算无法提供可信证明，买卖双方无法验证计算的准确性。TEE 提供了硬件级别的信任根，使得计算结果可验证且不可篡改。

### Q4: 性能如何？处理大量文档需要多久？

TEE 计算性能接近普通服务器（略有开销）。处理 100 个财务文档预计 < 1 秒。瓶颈主要在前端下载和解密 Walrus blobs。

### Q5: 成本如何？

- Nautilus TEE 计算费用：根据计算时长收费（具体费率待确认）
- Sui 链上验证：Gas 费用固定（约 0.01 SUI）
- Walrus 存储：按存储大小和时长收费

## 总结

通过集成 Nautilus TEE，我们实现了：

✅ **可信计算**: KPI 计算在隔离环境中进行，防篡改
✅ **可验证性**: 链上验证 TEE attestation，确保结果真实性
✅ **隐私保护**: 财务数据仍然加密，只在 TEE 中解密计算
✅ **去中心化**: 前端直接调用 TEE，无需信任中心化服务器
✅ **审计友好**: Auditor 可以独立验证所有文档和计算过程
