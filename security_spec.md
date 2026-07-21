# Security Specification: Warung Daeng Firestore Security Hardening

This specification defines the security invariants, validation constraints, and defensive posture for Warung Daeng's real-time Firestore database. It follows the Zero-Trust Architecture principles and the Eight Pillars of Hardened Firestore Rules.

## 1. Data Invariants

1. **Authenticated Access Only**: All read and write operations require a valid authenticated Firebase Auth session (including Anonymous guest sessions).
2. **Order Integrity**: 
   - An order must contain at least one item.
   - Total calculation must be non-negative.
   - State transitions must be sequential (PENDING -> COOKING -> READY -> DELIVERED).
   - `createdAt` must be set to the server timestamp `request.time` during creation and remains immutable.
3. **Menu & Inventory Sanity**: Price and stock quantities must be non-negative integers.
4. **Id Validation**: All document IDs must be alphanumeric strings, capped at 128 characters to prevent Denial of Wallet injection attacks.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 payloads are designed to attack the system but will be strictly blocked by our hardened rules:

### Attack 1: Unauthenticated Read
- **Target**: `menu/1`
- **Payload**: Attempt to fetch without auth header.
- **Result**: `PERMISSION_DENIED`

### Attack 2: Identity Spoofing in Customer Creation
- **Target**: `customers/attacker_id`
- **Payload**: `{"id": "another_user_id", "name": "Fake Name", "phone": "08123456789"}`
- **Result**: `PERMISSION_DENIED`

### Attack 3: Shadow Update / Ghost Field Injection
- **Target**: `menu/1`
- **Payload**: `{"id": "1", "name": "Bakso", "category": "Makanan", "price": 5000, "attackerField": "malicious_payload"}`
- **Result**: `PERMISSION_DENIED`

### Attack 4: Order Status Terminal Lock Bypass
- **Target**: `orders/completed_order`
- **Payload**: Attempt to update an order with status `'DELIVERED'` back to `'PENDING'`.
- **Result**: `PERMISSION_DENIED`

### Attack 5: Negative Price Poisoning
- **Target**: `menu/poison_item`
- **Payload**: `{"name": "Free Food", "category": "Makanan", "price": -10000, "stock": 100, "minStock": 5, "unit": "Pcs"}`
- **Result**: `PERMISSION_DENIED`

### Attack 6: Massive ID Denial of Wallet
- **Target**: `orders/` (Document ID with 10KB of junk characters)
- **Result**: `PERMISSION_DENIED`

### Attack 7: Client-provided Future Timestamp Spoofing
- **Target**: `orders/order_123`
- **Payload**: `{"createdAt": "2030-12-31T23:59:59Z", "total": 5000, "status": "PENDING"}`
- **Result**: `PERMISSION_DENIED`

### Attack 8: Stock Level Underflow
- **Target**: `inventory/item_1`
- **Payload**: `{"name": "Daging Sapi", "stock": -50, "minStock": 10, "unit": "Kg", "category": "Daging"}`
- **Result**: `PERMISSION_DENIED`

### Attack 9: Employee PIN Modification (Privilege Escalation)
- **Target**: `employees/emp_3`
- **Payload**: Attempting to alter pin from `'333333'` to `'999999'` without admin privilege.
- **Result**: `PERMISSION_DENIED`

### Attack 10: Empty Order Submission
- **Target**: `orders/empty_order`
- **Payload**: `{"items": [], "total": 0, "status": "PENDING"}`
- **Result**: `PERMISSION_DENIED`

### Attack 11: Non-Integer Point Accrual
- **Target**: `customers/c_1`
- **Payload**: `{"points": "infinite", "level": "Gold"}`
- **Result**: `PERMISSION_DENIED`

### Attack 12: Invalid Payment Method Injection
- **Target**: `orders/order_payment`
- **Payload**: `{"items": [...], "total": 5000, "status": "PENDING", "paymentMethod": "CRYPTO_SPOOF"}`
- **Result**: `PERMISSION_DENIED`

---

## 3. Hardened Security Rules Blueprint

We implement these constraints directly in `firestore.rules` using declarative helper functions:
- `isValidId(id)`: Enforces size <= 128 and matches `^[a-zA-Z0-9_\-]+$`.
- `incoming()`: Safe alias for request resource data.
- `existing()`: Safe alias for resource data.
- `isSignedIn()`: Requiring active authenticated session.
- `isValidOrder()`: Schema validation for order structure.
