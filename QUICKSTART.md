# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Sui CLI installed (`cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui`)
- Sui wallet with testnet SUI tokens

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Deploy Smart Contracts
```bash
cd move/earnout
sui move build
sui client publish --gas-budget 100000000
```

**Important:** Copy the Package ID from the output. It looks like:
```
Published Objects:
└─ PackageID: 0x1234567890abcdef...
```

### Step 3: Configure Environment
Open `.env.local` and paste your Package ID:
```bash
NEXT_PUBLIC_SUI_PACKAGE_ID_EARNOUT=0x1234567890abcdef...
```

### Step 4: Start Development Server
```bash
npm run dev
```

### Step 5: Test It Out
1. Visit http://localhost:3000
2. Click "Connect Wallet"
3. Select your Sui wallet
4. You'll be redirected to `/deals`
5. Click "Create New Deal"
6. Fill in the form:
   - Deal Name: "Test Acquisition"
   - Closing Date: (pick a future date)
   - Currency: USD
   - Seller Address: (paste a Sui address)
   - Auditor Address: (paste another Sui address)
   - Escrow Amount: 100 (SUI)
7. Click "Create Deal"
8. Sign the transaction in your wallet
9. Success! View your deal

## 📋 What You Can Do Now

✅ Create earn-out deals
✅ View all your deals
✅ Filter by role (buyer/seller/auditor)
✅ See deal details
✅ Track escrow balances
✅ Monitor deal status

## 🔧 Troubleshooting

### "No wallet detected"
- Install Sui Wallet browser extension
- Or use Suiet Wallet

### "Insufficient gas"
- Get testnet SUI from faucet: https://discord.gg/sui
- Use command: `!faucet YOUR_ADDRESS`

### "Package ID not found"
- Make sure you updated `.env.local` with the Package ID
- Restart the dev server after updating .env

### "Transaction failed"
- Check you have enough SUI for gas + escrow
- Verify seller/auditor addresses are valid Sui addresses (0x... format, 66 chars)

## 📚 Next Steps

1. ✅ Create a few test deals
2. ✅ View them in different roles
3. ✅ Check the deal details page
4. ➡️ Implement parameter setup (next phase)
5. ➡️ Add Walrus file upload
6. ➡️ Build KPI management
7. ➡️ Complete settlement flow

## 🎯 Key Features Completed

- ✅ Full deal lifecycle (create → view → detail)
- ✅ Multi-wallet support
- ✅ Role-based access (buyer/seller/auditor)
- ✅ On-chain escrow management
- ✅ Status tracking
- ✅ Responsive UI
- ✅ Form validation
- ✅ Transaction signing

## 📖 Documentation

- **IMPLEMENTATION_SUMMARY.md** - What was built
- **DEAL_MANAGEMENT_COMPLETE.md** - Detailed technical guide
- **move/earnout/README.md** - Smart contract docs
- **/api-docs** - API documentation (visit when server is running)

## 💬 Need Help?

Check the detailed documentation files:
1. Start with IMPLEMENTATION_SUMMARY.md
2. For technical details, see DEAL_MANAGEMENT_COMPLETE.md
3. For smart contracts, see move/earnout/README.md

---

**Happy Building! 🎉**
