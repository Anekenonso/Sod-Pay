use tari_template_lib::prelude::*;

#[template]
mod sod_pay_template {
    use super::*;

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SodStatus {
        Created,
        Paid,
        Claimed,
        Cancelled,
        Revealed,
    }

    pub struct SodPay {
        status: SodStatus,
        amount: Option<Amount>,
        description: String,
        creator: RistrettoPublicKeyBytes,
        claim_badge_resource: ResourceAddress,
        vault: Vault,
        expiry_epoch: Option<u64>,
        is_revealed: bool,
        reveal_requested_by: Option<RistrettoPublicKeyBytes>,
        payer: Option<RistrettoPublicKeyBytes>,
    }

    impl SodPay {
        /// Creates a new Sod private payment component and mints 1 claim badge for creator.
        pub fn create(
            amount: Option<Amount>,
            description: String,
            expiry_epoch: Option<u64>,
        ) -> (Component<Self>, Bucket) {
            let caller = CallerContext::transaction_signer_public_key();

            // Create non-fungible claim badge resource
            let badge_bucket = ResourceBuilder::non_fungible()
                .initial_supply([NonFungibleId::from_u64(1)]);
            let claim_badge_resource = badge_bucket.resource_address();

            let rules = ComponentAccessRules::new()
                .add_method_rule("pay", rule!(allow_all))
                .add_method_rule("claim", rule!(resource(claim_badge_resource)))
                .add_method_rule("cancel", rule!(public_key(caller)))
                .add_method_rule("request_reveal", rule!(allow_all))
                .add_method_rule("approve_reveal", rule!(allow_all));

            let component = Component::new(Self {
                status: SodStatus::Created,
                amount,
                description,
                creator: caller,
                claim_badge_resource,
                vault: Vault::new_empty(TARI_TOKEN),
                expiry_epoch,
                is_revealed: false,
                reveal_requested_by: None,
                payer: None,
            })
            .with_access_rules(rules)
            .create();

            emit_event("SodCreated", [("status", "Created")]);

            (component, badge_bucket)
        }

        /// Pay into confidential vault.
        pub fn pay(&mut self, payment: Bucket) {
            assert_eq!(
                self.status,
                SodStatus::Created,
                "Cannot pay: Sod is not in Created status"
            );

            if let Some(expiry) = self.expiry_epoch {
                let current_epoch = Consensus::current_epoch();
                assert!(
                    current_epoch <= expiry,
                    "Payment link has expired"
                );
            }

            if let Some(expected_amount) = self.amount {
                assert_eq!(
                    payment.amount(),
                    expected_amount,
                    "Wrong amount: expected {}, received {}",
                    expected_amount,
                    payment.amount()
                );
            }

            let payer = CallerContext::transaction_signer_public_key();
            self.payer = Some(payer);
            self.vault.deposit(payment);
            self.status = SodStatus::Paid;

            emit_event("SodPaid", [("status", "Paid")]);
        }

        /// Claim funds from vault using claim badge.
        pub fn claim(&mut self) -> Bucket {
            assert!(
                self.status == SodStatus::Paid || self.status == SodStatus::Revealed,
                "Cannot claim: funds are not Paid"
            );

            self.status = SodStatus::Claimed;
            emit_event("SodClaimed", [("status", "Claimed")]);

            self.vault.withdraw_all()
        }

        /// Cancel an unpaid Sod. Only creator can cancel, and only from Created status.
        pub fn cancel(&mut self) {
            assert_eq!(
                self.status,
                SodStatus::Created,
                "Cannot cancel: only Created Sods can be cancelled"
            );

            let caller = CallerContext::transaction_signer_public_key();
            assert_eq!(caller, self.creator, "Only creator can cancel");

            self.status = SodStatus::Cancelled;
            emit_event("SodCancelled", [("status", "Cancelled")]);
        }

        /// Request reveal of the payment amount.
        pub fn request_reveal(&mut self) {
            assert!(
                self.status == SodStatus::Paid || self.status == SodStatus::Claimed,
                "Reveal can only be requested on Paid or Claimed Sods"
            );
            assert!(!self.is_revealed, "Already revealed");
            assert!(
                self.reveal_requested_by.is_none(),
                "Reveal already requested"
            );

            let caller = CallerContext::transaction_signer_public_key();
            assert!(
                caller == self.creator || Some(caller) == self.payer,
                "Unauthorized: only creator or payer can request reveal"
            );

            self.reveal_requested_by = Some(caller);
            emit_event("SodRevealRequested", [("requester", "participant")]);
        }

        /// Approve reveal of the payment amount (requires two distinct parties).
        pub fn approve_reveal(&mut self) {
            assert!(
                self.status == SodStatus::Paid || self.status == SodStatus::Claimed,
                "Reveal can only be approved on Paid or Claimed Sods"
            );
            assert!(!self.is_revealed, "Already revealed");
            let requested_by = self
                .reveal_requested_by
                .expect("No pending reveal request to approve");

            let caller = CallerContext::transaction_signer_public_key();
            assert_ne!(
                caller, requested_by,
                "Cannot approve own reveal request; mutual consent required"
            );
            assert!(
                caller == self.creator || Some(caller) == self.payer,
                "Unauthorized: only creator or payer can approve reveal"
            );

            self.is_revealed = true;
            self.status = SodStatus::Revealed;
            emit_event("SodRevealed", [("status", "Revealed")]);
        }

        /// Read current status
        pub fn get_status(&self) -> SodStatus {
            self.status
        }

        /// Check if revealed
        pub fn is_revealed(&self) -> bool {
            self.is_revealed
        }

        /// Read amount if revealed
        pub fn get_amount(&self) -> Option<Amount> {
            if self.is_revealed {
                self.amount
            } else {
                None
            }
        }
    }
}

pub use sod_pay_template::SodStatus;

/// Standalone domain state engine for unit and integration testing
#[derive(Debug, Clone)]
pub struct SodEngine {
    pub status: SodStatus,
    pub amount: Option<u64>,
    pub description: String,
    pub creator: String,
    pub claim_badge_id: String,
    pub vault_balance: u64,
    pub expiry_epoch: Option<u64>,
    pub is_revealed: bool,
    pub reveal_requested_by: Option<String>,
    pub payer: Option<String>,
}

impl SodEngine {
    pub fn new(creator: String, amount: Option<u64>, description: String, expiry_epoch: Option<u64>) -> (Self, String) {
        let badge_id = format!("badge_{}", creator);
        (
            Self {
                status: SodStatus::Created,
                amount,
                description,
                creator,
                claim_badge_id: badge_id.clone(),
                vault_balance: 0,
                expiry_epoch,
                is_revealed: false,
                reveal_requested_by: None,
                payer: None,
            },
            badge_id,
        )
    }

    pub fn pay(&mut self, payer: String, amount: u64, current_epoch: u64) -> Result<(), &'static str> {
        if self.status != SodStatus::Created {
            return Err("Cannot pay: Sod is not in Created status");
        }
        if let Some(expiry) = self.expiry_epoch {
            if current_epoch > expiry {
                return Err("Payment link has expired");
            }
        }
        if let Some(expected) = self.amount {
            if amount != expected {
                return Err("Wrong payment amount");
            }
        }
        self.payer = Some(payer);
        self.vault_balance += amount;
        self.status = SodStatus::Paid;
        Ok(())
    }

    pub fn claim(&mut self, presented_badge: &str) -> Result<u64, &'static str> {
        if self.status != SodStatus::Paid && self.status != SodStatus::Revealed {
            return Err("Cannot claim: funds are not Paid");
        }
        if presented_badge != self.claim_badge_id {
            return Err("Unauthorized: only claim badge holder can unlock funds");
        }
        let funds = self.vault_balance;
        self.vault_balance = 0;
        self.status = SodStatus::Claimed;
        Ok(funds)
    }

    pub fn cancel(&mut self, caller: &str) -> Result<(), &'static str> {
        if self.status != SodStatus::Created {
            return Err("Cannot cancel: only Created Sods can be cancelled");
        }
        if caller != self.creator {
            return Err("Only creator can cancel");
        }
        self.status = SodStatus::Cancelled;
        Ok(())
    }

    pub fn request_reveal(&mut self, caller: &str) -> Result<(), &'static str> {
        if self.status != SodStatus::Paid && self.status != SodStatus::Claimed {
            return Err("Reveal can only be requested on Paid or Claimed Sods");
        }
        if self.is_revealed {
            return Err("Already revealed");
        }
        if self.reveal_requested_by.is_some() {
            return Err("Reveal already requested");
        }
        if caller != self.creator && Some(caller) != self.payer.as_deref() {
            return Err("Unauthorized: only creator or payer can request reveal");
        }
        self.reveal_requested_by = Some(caller.to_string());
        Ok(())
    }

    pub fn approve_reveal(&mut self, caller: &str) -> Result<(), &'static str> {
        if self.status != SodStatus::Paid && self.status != SodStatus::Claimed {
            return Err("Reveal can only be approved on Paid or Claimed Sods");
        }
        if self.is_revealed {
            return Err("Already revealed");
        }
        let requested_by = self.reveal_requested_by.as_deref().ok_or("No pending reveal request")?;
        if caller == requested_by {
            return Err("Cannot approve own reveal request; mutual consent required (R-05)");
        }
        if caller != self.creator && Some(caller) != self.payer.as_deref() {
            return Err("Unauthorized: only creator or payer can approve reveal");
        }
        self.is_revealed = true;
        self.status = SodStatus::Revealed;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_full_lifecycle_create_pay_claim_reveal() {
        // R-01: Create
        let (mut engine, badge_id) = SodEngine::new("alice".into(), Some(100), "Web design".into(), Some(500));
        assert_eq!(engine.status, SodStatus::Created);
        assert!(!engine.is_revealed);

        // R-03: Pay
        assert!(engine.pay("bob".into(), 100, 100).is_ok());
        assert_eq!(engine.status, SodStatus::Paid);
        assert_eq!(engine.vault_balance, 100);

        // R-04: Claim without badge fails
        assert!(engine.claim("fake_badge").is_err());
        // Claim with badge succeeds
        let claimed = engine.claim(&badge_id).unwrap();
        assert_eq!(claimed, 100);
        assert_eq!(engine.status, SodStatus::Claimed);

        // R-05: Reveal
        assert!(engine.request_reveal("alice").is_ok());
        // Alice cannot approve her own request (R-05, B-03)
        assert!(engine.approve_reveal("alice").is_err());
        // Bob approves
        assert!(engine.approve_reveal("bob").is_ok());
        assert!(engine.is_revealed);
        assert_eq!(engine.status, SodStatus::Revealed);
    }

    #[test]
    fn test_cancel_only_created_by_creator() {
        let (mut engine, _) = SodEngine::new("alice".into(), Some(50), "Gig".into(), None);
        // Stranger cannot cancel
        assert!(engine.cancel("bob").is_err());
        // Alice cancels
        assert!(engine.cancel("alice").is_ok());
        assert_eq!(engine.status, SodStatus::Cancelled);

        // Cannot pay after cancelled
        assert!(engine.pay("bob".into(), 50, 10).is_err());
    }

    #[test]
    fn test_cancel_from_paid_fails() {
        let (mut engine, _) = SodEngine::new("alice".into(), Some(50), "Gig".into(), None);
        engine.pay("bob".into(), 50, 10).unwrap();
        // Cancel from Paid MUST fail (R-06, B-04)
        assert!(engine.cancel("alice").is_err());
        assert_eq!(engine.status, SodStatus::Paid);
    }

    #[test]
    fn test_wrong_amount_fails() {
        let (mut engine, _) = SodEngine::new("alice".into(), Some(100), "Fixed fee".into(), None);
        // Pay with 50 instead of 100 fails
        assert!(engine.pay("bob".into(), 50, 10).is_err());
    }

    #[test]
    fn test_expired_payment_fails() {
        let (mut engine, _) = SodEngine::new("alice".into(), Some(100), "Short expiry".into(), Some(200));
        // Current epoch 201 is past expiry 200
        assert!(engine.pay("bob".into(), 100, 201).is_err());
    }
}
