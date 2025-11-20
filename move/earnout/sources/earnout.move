/// Earnout Contract - M&A Earn-out Management System
///
/// This module manages earn-out agreements between buyers, sellers, and auditors.
/// It handles:
/// - Deal creation with multiple earn-out periods
/// - KPI parameter configuration
/// - Data upload tracking (Walrus blob references)
/// - KPI proposal by buyers
/// - KPI attestation by auditors
/// - Automated settlement calculations
module earnout::earnout {
    use std::string::{Self, String};
    use sui::event;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::vec_map::{Self, VecMap};

    // ===== Errors =====
    const ENotAuthorized: u64 = 1;
    const EInvalidPeriod: u64 = 2;
    const EInvalidStatus: u64 = 3;
    const EParametersAlreadySet: u64 = 4;
    const EParametersNotSet: u64 = 5;
    const EInsufficientBalance: u64 = 6;
    const EKPINotProposed: u64 = 7;
    const EKPINotAttested: u64 = 8;
    const EAlreadySettled: u64 = 9;
    const EKPINotApproved: u64 = 10;

    // ===== Status Constants =====
    const STATUS_DRAFT: u8 = 0;
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_COMPLETED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;

    const PERIOD_STATUS_PENDING: u8 = 0;
    const PERIOD_STATUS_DATA_COLLECTION: u8 = 1;
    const PERIOD_STATUS_KPI_PROPOSED: u8 = 2;
    const PERIOD_STATUS_KPI_ATTESTED: u8 = 3;
    const PERIOD_STATUS_SETTLED: u8 = 4;

    // ===== Formula Types =====
    const FORMULA_LINEAR: u8 = 0;
    const FORMULA_STEPPED: u8 = 1;
    const FORMULA_PERCENTAGE: u8 = 2;
    const FORMULA_CUSTOM: u8 = 3;

    // ===== Structs =====

    /// Main Deal object representing an earn-out agreement
    public struct Deal has key, store {
        id: UID,
        name: String,
        closing_date: u64, // Unix timestamp
        currency: String,
        buyer: address,
        seller: address,
        auditor: address,
        status: u8,
        escrow_balance: Balance<SUI>, // Holds funds for settlements
        periods: Table<u64, Period>, // period_id => Period
        period_count: u64,
        parameters_set: bool,
        metadata: VecMap<String, String>, // Flexible key-value storage
    }

    /// Earn-out period with KPI tracking
    public struct Period has store {
        period_id: u64,
        name: String,
        start_date: u64,
        end_date: u64,
        status: u8,
        kpi_types: vector<String>, // e.g., ["revenue", "ebitda", "user_growth"]
        formula_type: u8,
        formula_params: VecMap<String, String>, // Flexible formula parameters
        walrus_blobs: vector<WalrusBlob>,
        kpi_proposal: Option<KPIProposal>,
        kpi_attestation: Option<KPIAttestation>,
        settlement: Option<Settlement>,
    }

    /// Reference to a Walrus blob (encrypted financial data)
    public struct WalrusBlob has store, copy, drop {
        blob_id: String,
        data_type: String, // e.g., "financial_report", "invoice", "contract"
        filename: String,
        size: u64,
        uploader: address,
        timestamp: u64,
        encrypted: bool,
    }

    /// KPI proposal submitted by buyer
    public struct KPIProposal has store, copy, drop {
        values: VecMap<String, u64>, // kpi_type => value
        proposed_by: address,
        proposed_at: u64,
        supporting_blob_ids: vector<String>,
        comments: String,
    }

    /// KPI attestation by auditor
    public struct KPIAttestation has store, copy, drop {
        values: VecMap<String, u64>, // kpi_type => attested_value
        attested_by: address,
        attested_at: u64,
        approved: bool,
        verified_blob_ids: vector<String>,
        comments: String,
    }

    /// Settlement record
    public struct Settlement has store, copy, drop {
        calculated_payout: u64,
        executed_at: u64,
        executed_by: address,
        transaction_hash: String,
    }

    // ===== Events =====

    public struct DealCreated has copy, drop {
        deal_id: ID,
        name: String,
        buyer: address,
        seller: address,
        auditor: address,
        timestamp: u64,
    }

    public struct ParametersSet has copy, drop {
        deal_id: ID,
        period_count: u64,
        timestamp: u64,
    }

    public struct WalrusBlobAdded has copy, drop {
        deal_id: ID,
        period_id: u64,
        blob_id: String,
        uploader: address,
        timestamp: u64,
    }

    public struct KPIProposed has copy, drop {
        deal_id: ID,
        period_id: u64,
        proposed_by: address,
        timestamp: u64,
    }

    public struct KPIAttested has copy, drop {
        deal_id: ID,
        period_id: u64,
        attested_by: address,
        approved: bool,
        timestamp: u64,
    }

    public struct SettlementExecuted has copy, drop {
        deal_id: ID,
        period_id: u64,
        payout: u64,
        recipient: address,
        timestamp: u64,
    }

    public struct DealStatusChanged has copy, drop {
        deal_id: ID,
        old_status: u8,
        new_status: u8,
        timestamp: u64,
    }

    // ===== Public Functions =====

    /// Create a new earn-out deal
    public fun create_deal(
        name: String,
        closing_date: u64,
        currency: String,
        seller: address,
        auditor: address,
        escrow_funds: Coin<SUI>,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ): Deal {
        let buyer = ctx.sender();
        let deal_id = object::new(ctx);
        let id_copy = object::uid_to_inner(&deal_id);

        let deal = Deal {
            id: deal_id,
            name,
            closing_date,
            currency,
            buyer,
            seller,
            auditor,
            status: STATUS_DRAFT,
            escrow_balance: coin::into_balance(escrow_funds),
            periods: table::new(ctx),
            period_count: 0,
            parameters_set: false,
            metadata: vec_map::empty(),
        };

        event::emit(DealCreated {
            deal_id: id_copy,
            name: deal.name,
            buyer,
            seller,
            auditor,
            timestamp: sui::clock::timestamp_ms(clock),
        });

        deal
    }

    /// Add earn-out parameters and periods
    public fun set_parameters(
        deal: &mut Deal,
        periods_data: vector<PeriodData>,
        clock: &sui::clock::Clock,
        ctx: &TxContext
    ) {
        assert!(deal.buyer == ctx.sender(), ENotAuthorized);
        assert!(!deal.parameters_set, EParametersAlreadySet);
        assert!(deal.status == STATUS_DRAFT, EInvalidStatus);

        let i = 0;
        let len = vector::length(&periods_data);

        while (i < len) {
            let period_data = vector::borrow(&periods_data, i);
            let period = Period {
                period_id: i,
                name: period_data.name,
                start_date: period_data.start_date,
                end_date: period_data.end_date,
                status: PERIOD_STATUS_PENDING,
                kpi_types: period_data.kpi_types,
                formula_type: period_data.formula_type,
                formula_params: period_data.formula_params,
                walrus_blobs: vector::empty(),
                kpi_proposal: option::none(),
                kpi_attestation: option::none(),
                settlement: option::none(),
            };

            table::add(&mut deal.periods, i, period);
            i = i + 1;
        };

        deal.period_count = len;
        deal.parameters_set = true;
        deal.status = STATUS_ACTIVE;

        event::emit(ParametersSet {
            deal_id: object::uid_to_inner(&deal.id),
            period_count: len,
            timestamp: sui::clock::timestamp_ms(clock),
        });

        event::emit(DealStatusChanged {
            deal_id: object::uid_to_inner(&deal.id),
            old_status: STATUS_DRAFT,
            new_status: STATUS_ACTIVE,
            timestamp: sui::clock::timestamp_ms(clock),
        });
    }

    /// Add a Walrus blob reference to a period
    public fun add_walrus_blob(
        deal: &mut Deal,
        period_id: u64,
        blob_id: String,
        data_type: String,
        filename: String,
        size: u64,
        encrypted: bool,
        clock: &sui::clock::Clock,
        ctx: &TxContext
    ) {
        assert!(deal.parameters_set, EParametersNotSet);
        assert!(
            deal.buyer == ctx.sender() ||
            deal.seller == ctx.sender() ||
            deal.auditor == ctx.sender(),
            ENotAuthorized
        );
        assert!(period_id < deal.period_count, EInvalidPeriod);

        let period = table::borrow_mut(&mut deal.periods, period_id);
        let timestamp = sui::clock::timestamp_ms(clock);

        let blob = WalrusBlob {
            blob_id,
            data_type,
            filename,
            size,
            uploader: ctx.sender(),
            timestamp,
            encrypted,
        };

        vector::push_back(&mut period.walrus_blobs, blob);

        // Update period status if it's still pending
        if (period.status == PERIOD_STATUS_PENDING) {
            period.status = PERIOD_STATUS_DATA_COLLECTION;
        };

        event::emit(WalrusBlobAdded {
            deal_id: object::uid_to_inner(&deal.id),
            period_id,
            blob_id: blob.blob_id,
            uploader: ctx.sender(),
            timestamp,
        });
    }

    /// Buyer proposes KPI values for a period
    public fun propose_kpi(
        deal: &mut Deal,
        period_id: u64,
        kpi_values: VecMap<String, u64>,
        supporting_blob_ids: vector<String>,
        comments: String,
        clock: &sui::clock::Clock,
        ctx: &TxContext
    ) {
        assert!(deal.buyer == ctx.sender(), ENotAuthorized);
        assert!(period_id < deal.period_count, EInvalidPeriod);

        let period = table::borrow_mut(&mut deal.periods, period_id);
        let timestamp = sui::clock::timestamp_ms(clock);

        let proposal = KPIProposal {
            values: kpi_values,
            proposed_by: ctx.sender(),
            proposed_at: timestamp,
            supporting_blob_ids,
            comments,
        };

        period.kpi_proposal = option::some(proposal);
        period.status = PERIOD_STATUS_KPI_PROPOSED;

        event::emit(KPIProposed {
            deal_id: object::uid_to_inner(&deal.id),
            period_id,
            proposed_by: ctx.sender(),
            timestamp,
        });
    }

    /// Auditor attests KPI values for a period
    public fun attest_kpi(
        deal: &mut Deal,
        period_id: u64,
        attested_values: VecMap<String, u64>,
        approved: bool,
        verified_blob_ids: vector<String>,
        comments: String,
        clock: &sui::clock::Clock,
        ctx: &TxContext
    ) {
        assert!(deal.auditor == ctx.sender(), ENotAuthorized);
        assert!(period_id < deal.period_count, EInvalidPeriod);

        let period = table::borrow_mut(&mut deal.periods, period_id);
        assert!(option::is_some(&period.kpi_proposal), EKPINotProposed);

        let timestamp = sui::clock::timestamp_ms(clock);

        let attestation = KPIAttestation {
            values: attested_values,
            attested_by: ctx.sender(),
            attested_at: timestamp,
            approved,
            verified_blob_ids,
            comments,
        };

        period.kpi_attestation = option::some(attestation);
        period.status = PERIOD_STATUS_KPI_ATTESTED;

        event::emit(KPIAttested {
            deal_id: object::uid_to_inner(&deal.id),
            period_id,
            attested_by: ctx.sender(),
            approved,
            timestamp,
        });
    }

    /// Execute settlement for a period
    public fun settle(
        deal: &mut Deal,
        period_id: u64,
        calculated_payout: u64,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        assert!(
            deal.buyer == ctx.sender() || deal.auditor == ctx.sender(),
            ENotAuthorized
        );
        assert!(period_id < deal.period_count, EInvalidPeriod);

        let period = table::borrow_mut(&mut deal.periods, period_id);
        assert!(option::is_some(&period.kpi_attestation), EKPINotAttested);
        assert!(option::is_none(&period.settlement), EAlreadySettled);

        let attestation = option::borrow(&period.kpi_attestation);
        assert!(attestation.approved, EKPINotApproved);

        // Check sufficient balance
        let available = balance::value(&deal.escrow_balance);
        assert!(available >= calculated_payout, EInsufficientBalance);

        // Transfer payout to seller
        let payout_balance = balance::split(&mut deal.escrow_balance, calculated_payout);
        let payout_coin = coin::from_balance(payout_balance, ctx);
        transfer::public_transfer(payout_coin, deal.seller);

        let timestamp = sui::clock::timestamp_ms(clock);

        let settlement = Settlement {
            calculated_payout,
            executed_at: timestamp,
            executed_by: ctx.sender(),
            transaction_hash: string::utf8(b""), // Will be filled by indexer
        };

        period.settlement = option::some(settlement);
        period.status = PERIOD_STATUS_SETTLED;

        event::emit(SettlementExecuted {
            deal_id: object::uid_to_inner(&deal.id),
            period_id,
            payout: calculated_payout,
            recipient: deal.seller,
            timestamp,
        });

        // Check if all periods are settled
        let all_settled = check_all_periods_settled(deal);
        if (all_settled) {
            deal.status = STATUS_COMPLETED;
            event::emit(DealStatusChanged {
                deal_id: object::uid_to_inner(&deal.id),
                old_status: STATUS_ACTIVE,
                new_status: STATUS_COMPLETED,
                timestamp,
            });
        };
    }

    /// Add metadata to deal
    public fun add_metadata(
        deal: &mut Deal,
        key: String,
        value: String,
        ctx: &TxContext
    ) {
        assert!(deal.buyer == ctx.sender(), ENotAuthorized);
        vec_map::insert(&mut deal.metadata, key, value);
    }

    /// Cancel a deal (only in draft status)
    public fun cancel_deal(
        deal: &mut Deal,
        clock: &sui::clock::Clock,
        ctx: &TxContext
    ) {
        assert!(deal.buyer == ctx.sender(), ENotAuthorized);
        assert!(deal.status == STATUS_DRAFT, EInvalidStatus);

        let old_status = deal.status;
        deal.status = STATUS_CANCELLED;

        event::emit(DealStatusChanged {
            deal_id: object::uid_to_inner(&deal.id),
            old_status,
            new_status: STATUS_CANCELLED,
            timestamp: sui::clock::timestamp_ms(clock),
        });

        // Return escrow funds to buyer
        let escrow_value = balance::value(&deal.escrow_balance);
        if (escrow_value > 0) {
            let refund_balance = balance::withdraw_all(&mut deal.escrow_balance);
            let refund_coin = coin::from_balance(refund_balance, ctx);
            transfer::public_transfer(refund_coin, deal.buyer);
        };
    }

    // ===== View Functions =====

    public fun get_deal_info(deal: &Deal): (String, address, address, address, u8, u64) {
        (deal.name, deal.buyer, deal.seller, deal.auditor, deal.status, deal.period_count)
    }

    public fun get_period_status(deal: &Deal, period_id: u64): u8 {
        let period = table::borrow(&deal.periods, period_id);
        period.status
    }

    public fun get_escrow_balance(deal: &Deal): u64 {
        balance::value(&deal.escrow_balance)
    }

    public fun is_buyer(deal: &Deal, addr: address): bool {
        deal.buyer == addr
    }

    public fun is_seller(deal: &Deal, addr: address): bool {
        deal.seller == addr
    }

    public fun is_auditor(deal: &Deal, addr: address): bool {
        deal.auditor == addr
    }

    // ===== Helper Functions =====

    fun check_all_periods_settled(deal: &Deal): bool {
        let i = 0;
        while (i < deal.period_count) {
            let period = table::borrow(&deal.periods, i);
            if (period.status != PERIOD_STATUS_SETTLED) {
                return false
            };
            i = i + 1;
        };
        true
    }

    // ===== Helper Struct for Parameters =====

    public struct PeriodData has drop {
        name: String,
        start_date: u64,
        end_date: u64,
        kpi_types: vector<String>,
        formula_type: u8,
        formula_params: VecMap<String, String>,
    }

    public fun new_period_data(
        name: String,
        start_date: u64,
        end_date: u64,
        kpi_types: vector<String>,
        formula_type: u8,
        formula_params: VecMap<String, String>,
    ): PeriodData {
        PeriodData {
            name,
            start_date,
            end_date,
            kpi_types,
            formula_type,
            formula_params,
        }
    }

    // ===== Test Functions =====
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        // Test initialization if needed
    }
}
