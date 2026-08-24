# All stored and displayed prices are excl. VAT

The platform stores, computes, snapshots, and displays every price, discount, add-on, cancellation fee, and invoicing basis excl. VAT, as the spec requires. No column, function, or template adds VAT; VAT is applied later during manual invoicing in e-conomic (ADR-0001). Any user-visible amount carries the "ekskl. moms" label from `messages/da.ts`. A VAT rate is deliberately not modelled in v1.0.
