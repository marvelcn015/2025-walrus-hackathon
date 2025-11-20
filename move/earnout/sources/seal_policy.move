/// Seal Policy Module - Access Control for Encrypted Data
///
/// This module manages access control policies for Walrus blobs encrypted with Seal.
/// It ensures that only authorized parties (buyer, seller, auditor) can decrypt
/// financial documents associated with a deal.
module earnout::seal_policy {
    use std::string::String;
    use sui::event;
    use earnout::earnout::{Self, Deal};

    // ===== Errors =====
    const ENotAuthorized: u64 = 1;
    const EInvalidDeal: u64 = 2;
    const EBlobNotFound: u64 = 3;

    // ===== Structs =====

    /// Access policy for a specific blob
    public struct BlobAccessPolicy has key, store {
        id: UID,
        deal_id: ID,
        blob_id: String,
        authorized_readers: vector<address>, // buyer, seller, auditor
        created_at: u64,
        creator: address,
    }

    /// Registry mapping blob IDs to their access policies
    public struct PolicyRegistry has key {
        id: UID,
        policies: sui::table::Table<String, ID>, // blob_id => policy_id
    }

    // ===== Events =====

    public struct PolicyCreated has copy, drop {
        policy_id: ID,
        deal_id: ID,
        blob_id: String,
        authorized_readers: vector<address>,
        timestamp: u64,
    }

    public struct AccessGranted has copy, drop {
        policy_id: ID,
        blob_id: String,
        requester: address,
        timestamp: u64,
    }

    public struct AccessDenied has copy, drop {
        blob_id: String,
        requester: address,
        reason: String,
        timestamp: u64,
    }

    // ===== Initialization =====

    fun init(ctx: &mut TxContext) {
        let registry = PolicyRegistry {
            id: object::new(ctx),
            policies: sui::table::new(ctx),
        };
        transfer::share_object(registry);
    }

    // ===== Public Functions =====

    /// Create an access policy for a Walrus blob
    public fun create_policy(
        registry: &mut PolicyRegistry,
        deal: &Deal,
        blob_id: String,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ): BlobAccessPolicy {
        // Get deal participants
        let (_, buyer, seller, auditor, _, _) = earnout::get_deal_info(deal);

        // Create authorized readers list
        let authorized_readers = vector::empty<address>();
        vector::push_back(&mut authorized_readers, buyer);
        vector::push_back(&mut authorized_readers, seller);
        vector::push_back(&mut authorized_readers, auditor);

        let policy_id = object::new(ctx);
        let policy_id_copy = object::uid_to_inner(&policy_id);
        let deal_id = object::id(deal);

        let policy = BlobAccessPolicy {
            id: policy_id,
            deal_id,
            blob_id,
            authorized_readers,
            created_at: sui::clock::timestamp_ms(clock),
            creator: ctx.sender(),
        };

        // Register policy in registry
        sui::table::add(&mut registry.policies, blob_id, policy_id_copy);

        event::emit(PolicyCreated {
            policy_id: policy_id_copy,
            deal_id,
            blob_id: policy.blob_id,
            authorized_readers: policy.authorized_readers,
            timestamp: sui::clock::timestamp_ms(clock),
        });

        policy
    }

    /// Check if an address is authorized to access a blob
    public fun is_authorized(
        policy: &BlobAccessPolicy,
        requester: address,
    ): bool {
        vector::contains(&policy.authorized_readers, &requester)
    }

    /// Request access to a blob (for Seal integration)
    public fun request_access(
        policy: &BlobAccessPolicy,
        clock: &sui::clock::Clock,
        ctx: &TxContext
    ): bool {
        let requester = ctx.sender();
        let timestamp = sui::clock::timestamp_ms(clock);

        if (is_authorized(policy, requester)) {
            event::emit(AccessGranted {
                policy_id: object::uid_to_inner(&policy.id),
                blob_id: policy.blob_id,
                requester,
                timestamp,
            });
            true
        } else {
            event::emit(AccessDenied {
                blob_id: policy.blob_id,
                requester,
                reason: std::string::utf8(b"Not authorized for this deal"),
                timestamp,
            });
            false
        }
    }

    /// Get policy for a blob ID
    public fun get_policy_id(
        registry: &PolicyRegistry,
        blob_id: String,
    ): &ID {
        assert!(
            sui::table::contains(&registry.policies, blob_id),
            EBlobNotFound
        );
        sui::table::borrow(&registry.policies, blob_id)
    }

    /// Check if a policy exists for a blob
    public fun policy_exists(
        registry: &PolicyRegistry,
        blob_id: String,
    ): bool {
        sui::table::contains(&registry.policies, blob_id)
    }

    /// Add additional authorized reader (e.g., for compliance officer)
    public fun add_authorized_reader(
        policy: &mut BlobAccessPolicy,
        deal: &Deal,
        new_reader: address,
        ctx: &TxContext
    ) {
        // Only buyer can add new readers
        assert!(earnout::is_buyer(deal, ctx.sender()), ENotAuthorized);

        if (!vector::contains(&policy.authorized_readers, &new_reader)) {
            vector::push_back(&mut policy.authorized_readers, new_reader);
        };
    }

    /// Remove authorized reader
    public fun remove_authorized_reader(
        policy: &mut BlobAccessPolicy,
        deal: &Deal,
        reader_to_remove: address,
        ctx: &TxContext
    ) {
        // Only buyer can remove readers
        assert!(earnout::is_buyer(deal, ctx.sender()), ENotAuthorized);

        let (exists, index) = vector::index_of(&policy.authorized_readers, &reader_to_remove);
        if (exists) {
            vector::remove(&mut policy.authorized_readers, index);
        };
    }

    // ===== View Functions =====

    public fun get_authorized_readers(policy: &BlobAccessPolicy): vector<address> {
        policy.authorized_readers
    }

    public fun get_deal_id(policy: &BlobAccessPolicy): ID {
        policy.deal_id
    }

    public fun get_blob_id(policy: &BlobAccessPolicy): String {
        policy.blob_id
    }

    // ===== Test Functions =====
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
