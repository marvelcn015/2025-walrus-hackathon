# Earnout Smart Contract

Move package for M&A earn-out management on Sui blockchain.

## Overview

This package contains two modules:

### 1. `earnout` Module
Core business logic for earn-out agreements:
- **Deal Creation**: Create earn-out deals with buyer, seller, and auditor roles
- **Parameter Setup**: Configure earn-out periods with KPI targets and formulas
- **Data Tracking**: Reference Walrus blobs (encrypted financial documents)
- **KPI Management**: Buyer proposes KPIs, auditor attests them
- **Settlement**: Automated payout calculation and execution

### 2. `seal_policy` Module
Access control for encrypted data:
- **Policy Management**: Define who can decrypt specific Walrus blobs
- **Authorization**: Verify access rights based on deal participation
- **Event Logging**: Track access requests and grants

## Key Features

- **Multi-period earn-outs**: Support multiple earn-out periods per deal
- **Flexible KPI types**: Revenue, EBITDA, user growth, ARR, custom metrics
- **Formula support**: Linear, stepped, percentage-based, and custom formulas
- **Escrow management**: Hold funds on-chain for automated settlement
- **Role-based access**: Buyer, seller, and auditor roles with different permissions
- **Encrypted data**: Integration with Walrus for decentralized storage and Seal for encryption
- **Event tracking**: Comprehensive event emissions for indexing and monitoring

## Data Flow

1. **Deal Creation**
   - Buyer creates deal with escrow funds
   - Specifies seller and auditor addresses

2. **Parameter Setup**
   - Buyer sets earn-out periods with KPI targets
   - Deal status changes from `DRAFT` to `ACTIVE`

3. **Data Collection**
   - Parties upload encrypted financial documents to Walrus
   - Blob references stored on-chain

4. **KPI Proposal**
   - Buyer proposes actual KPI values
   - References supporting Walrus blobs

5. **KPI Attestation**
   - Auditor reviews and attests KPI values
   - Approves or rejects the proposal

6. **Settlement**
   - If approved, buyer or auditor executes settlement
   - Funds transferred from escrow to seller
   - Settlement recorded on-chain

## Building and Deploying

### Prerequisites
```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

### Build
```bash
cd move/earnout
sui move build
```

### Test
```bash
sui move test
```

### Deploy to Testnet
```bash
sui client publish --gas-budget 100000000
```

### Get Package ID
After deployment, note the Package ID from the output. You'll need this for:
- Frontend integration (`NEXT_PUBLIC_SUI_PACKAGE_ID_EARNOUT`)
- API integration

## Object Structure

### Deal Object
```
Deal {
  name: String,
  closing_date: u64,
  buyer: address,
  seller: address,
  auditor: address,
  status: u8,
  escrow_balance: Balance<SUI>,
  periods: Table<u64, Period>,
  ...
}
```

### Period Object
```
Period {
  period_id: u64,
  start_date: u64,
  end_date: u64,
  kpi_types: vector<String>,
  formula_type: u8,
  kpi_proposal: Option<KPIProposal>,
  kpi_attestation: Option<KPIAttestation>,
  settlement: Option<Settlement>,
  ...
}
```

## Events

- `DealCreated`: Emitted when a new deal is created
- `ParametersSet`: Emitted when earn-out parameters are configured
- `WalrusBlobAdded`: Emitted when a data blob is referenced
- `KPIProposed`: Emitted when buyer proposes KPI values
- `KPIAttested`: Emitted when auditor attests KPI values
- `SettlementExecuted`: Emitted when settlement is completed
- `DealStatusChanged`: Emitted when deal status changes

## Status Values

### Deal Status
- `0` - DRAFT: Deal created but parameters not set
- `1` - ACTIVE: Parameters set, deal in progress
- `2` - COMPLETED: All periods settled
- `3` - CANCELLED: Deal cancelled

### Period Status
- `0` - PENDING: Period not started
- `1` - DATA_COLLECTION: Data being uploaded
- `2` - KPI_PROPOSED: Buyer proposed KPI values
- `3` - KPI_ATTESTED: Auditor attested KPI values
- `4` - SETTLED: Settlement executed

## Formula Types
- `0` - LINEAR: Linear interpolation
- `1` - STEPPED: Step function
- `2` - PERCENTAGE: Percentage-based
- `3` - CUSTOM: Custom formula logic

## Security Considerations

- **Authorization**: All sensitive functions check sender authorization
- **Status checks**: Functions verify deal/period status before execution
- **Balance checks**: Settlement ensures sufficient escrow funds
- **Immutability**: Once settled, periods cannot be modified
- **Event logging**: All actions emit events for transparency

## Integration with Walrus and Seal

1. **Upload to Walrus**: Frontend uploads encrypted files to Walrus
2. **Get Blob ID**: Walrus returns a blob ID
3. **Create Seal Policy**: Call `seal_policy::create_policy` with blob ID
4. **Add to Deal**: Call `earnout::add_walrus_blob` with blob ID
5. **Access Control**: Seal enforces policy when users try to decrypt

## Example Usage

See the frontend integration in `/app` and backend services in `/src/backend` for complete examples of:
- Creating deals with `create_deal`
- Setting parameters with `set_parameters`
- Uploading data with `add_walrus_blob`
- Managing KPIs with `propose_kpi` and `attest_kpi`
- Executing settlements with `settle`

## License

MIT
