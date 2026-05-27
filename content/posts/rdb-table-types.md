---
title: "Relational Database Tables and Relationships"
date: 2025-10-10
slug: rdb-table-types
description: "relational database + coding = a dev superpower, so I wrote about what I’ve learned along the way …"
topics: [rdb]
---

# Relational Database Tables and Relationships

Back when I was teaching, I developed an Excel-based System 
to handle scoring, ranking, and providing insights for competing teams 
in the school’s Sportfests. Previously, these tasks were manual and 
time-consuming. I achieved this by leveraging structured tables, 
filters, sorting, and advanced formulas, occasionally enhanced with macros.

At that time, I had neither knowledge of coding nor of databases, nor had I 
received any formal lessons in them. I never imagined that this would 
become the core of being a fullstack developer !

This experience was my first exposure to real-world data and sparked my
curiosity in programming and database. I quickly realized how powerful
data is in the modern world. And this fascination still drives me to this day.

---

*Before we proceed*: This discussion is not a full tutorial on relational tables or 
database design. It assumes readers already have a basic understanding of tables 
and relationships. Well, anyways, the lesson might be understood easily since I did not
tackle in depth the technical details, so just enjoy reading !

## Relational Database Table Types

### 1. **Regular Tables (Entity Tables)**

These are your main tables representing real-world entities. 
In an Inventory System,  these correspond to all your items. In other 
domains, such as fintech, these could represent customers, accounts, 
or transactions. Regular tables store the detailed, raw data that 
other tables or computations build upon, forming 
the foundation of your database or system.

* example: `Users`, `Products`, `Orders`
* Each table typically has a **primary key** (like `id`) to uniquely identify a row.

---

### 2. **Pivot / Bridge Tables (M:N Relationships)**

We love many-to-many relationships, right ? 😄 These tables are used to 
model **many-to-many relationships** between two entity tables.

* example: `Users` and `Roles`

  * One user can have many roles.
  * One role can belong to many users.
  * The **pivot table** might be called `UserRoles` 
    with columns: `user_id` and `role_id`.

* Pivot/bridge tables **implement M:N relationships**:

  * Each row connects **one record from each table**, and 
    collectively represents all relationships.
  * Additional columns can store metadata (e.g., `assigned_at`, `role_level`).

**Example Data:**

```
UserRoles
user_id | role_id | assigned_at
-------------------------------
1       | 101     | 2025-01-01
1       | 102     | 2025-02-15
2       | 101     | 2025-03-10
```

* Here, `user_id` references `Users.id` and `role_id` references `Roles.id`.

---

### 3. **Lookup / Reference Tables (1:N / N:1 Relationships)**

These tables store **static or semi-static data** 
used for categorization or validation.

* example: `Countries`, `Statuses`, `Categories`
* Lookup tables are typically the **"one" side 
  of a one-to-many (1:N) relationship**:

  * example: Many users can belong to one country 
    → `Users.country_id` points to `Countries.id`.
* From the child/master table perspective, this is 
  a **many-to-one (N:1) relationship**.
* Lookup tables rarely change and usually contain 
  an `id`, a `code`, and a descriptive `name`.

Use `id` or `code` ? That's the million-dollar 
question ! 😄 I usually keep both, since having the code makes 
it easier to read the raw data. Plus, clients typically 
have their own internal coding system for 
all entities, so it's often already provided.

**Example Data:**

```
Countries
id | code | name
------------------
1  | PH   | Philippines
2  | JP   | Japan

Users
id | name  | country_id
-----------------------
1  | Alice | 1
2  | Bob   | 1
3  | Carol | 2
```

* Alice and Bob belong to the Philippines (N:1 from Users → Countries),
* Each country has many users (1:N from Countries → Users).

**Design Consideration**: The `id` serves as the primary key for performance, 
while `code` provides business meaning that's often already established in 
client organizations. During debugging, 
seeing "PH" instead of "1" makes the data immediately understandable.

---

### 4. **Audit / History Tables**

Tables that store **logs or history** of changes.

* example: `OrderHistory`, `UserActivityLog`
* They are used for tracking changes, rollback, or analytics.

In real-world development, these audit tables can grow 
significantly over time. The level of granularity required for 
audits varies : in some systems, every action may be logged. 
In such cases, pagination becomes necessary when retrieving 
subsets of data (for example, data over a three-month period), 
since the size of that data can be unpredictable.

However, in other projects where the audit volume is small, say, around 
30 records per month — the data size for three months is predictable 
and manageable, so pagination may not be required.

---

### 5. **Aggregate / Summary Tables**

In larger devs, databases have precomputed summaries
for performance. These are commonly encountered in different 
scenarios, such as reports of projects completed 
in a year or inventory reports. To be efficient, we 
compute these summaries and save them in another table, 
possibly through a regular script, so as not 
to interrupt the user experience.

* example: `MonthlySalesSummary` to avoid recalculating 
  totals from the raw `Orders` table every time.

---

### **6. Configuration/Settings Tables**

These tables store **application-specific settings, feature flags, 
and system parameters** that control how your application behaves. 
Unlike lookup tables that categorize data, configuration tables 
define behavior.

Want to change your app's upload limit without redeploying ? Need to 
toggle features on/off ? Configuration tables are your friend ! 😄

* example: `AppSettings`, `FeatureFlags`, `SystemConfig`
* Typically have `key-value` pairs or `setting-value` structure
* Often cached in memory for performance
* May include metadata like `description`, `data_type`, 
  `last_modified`

**Example Data:**

```
AppSettings
key              | value    | data_type | description
-------------------------------------------------------
max_upload_size  | 10MB     | string    | Maximum file upload size
session_timeout  | 30       | integer   | Session timeout in minutes
maintenance_mode | false    | boolean   | Enable maintenance mode
theme_default    | dark     | string    | Default UI theme

FeatureFlags
feature_name     | enabled  | rollout_percentage | environment
------------------------------------------------------------- 
new_dashboard    | true     | 100               | production
beta_search      | false    | 0                 | production
ai_suggestions   | true     | 25                | staging
```

**Design Consideration**: Many developers store both the setting 
key and a human-readable description to make configuration 
management easier. The `data_type` column helps with validation 
and proper casting in application code.

---

### **7. Hierarchical/Tree Tables (Self-Referencing)**

These tables represent **nested, tree-like structures** where 
records can have parent-child relationships within the same table. 
Think organizational charts, category trees, comment threads, or 
file system structures.

The beauty of self-referencing tables ? One table handles unlimited 
hierarchy levels ! No need to create separate tables for each 
level of your tree structure.

* example: `Categories`, `Comments`, `OrganizationalUnits`, 
  `MenuItems`
* Uses `parent_id` that references the same table's `id`
* `parent_id` is `NULL` for root/top-level items
* Often includes additional columns like `level`, `sort_order`, 
  or `path`

**When to use hierarchical vs. multiple tables:**
- **Use hierarchical**: When depth is unknown/variable (categories, 
  comments, org charts)
- **Use multiple tables**: When structure is fixed (specific 
  business roles like Company → Department → Team)

**Example Data:**

```
Categories
id | name           | parent_id | level | sort_order
----------------------------------------------------
1  | Electronics    | NULL      | 1     | 1
2  | Phones         | 1         | 2     | 1
3  | Laptops        | 1         | 2     | 2
4  | iPhone         | 2         | 3     | 1
5  | Samsung        | 2         | 3     | 2
6  | Gaming Laptops | 3         | 3     | 1
7  | Business       | 3         | 3     | 2

Comments (Threaded Discussion)
id | content        | parent_id | user_id | created_at
----------------------------------------------------
1  | Great article! | NULL      | 101     | 2025-01-01
2  | Thanks!        | 1         | 102     | 2025-01-02
3  | I agree        | 1         | 103     | 2025-01-02
4  | Me too         | 3         | 104     | 2025-01-03
```

**Design Consideration**: The `level` column helps with display 
formatting and query optimization. The `sort_order` allows manual 
arrangement of items at the same level. Some developers also store 
a `path` column (like `/1/2/4/`) for faster tree traversal.

---

### **8. Temporary/Staging Tables**

These tables serve as **temporary storage** during data processing, 
imports, transformations, or complex multi-step operations. They're 
the workbenches of database operations.

* example: `temp_user_import`, `staging_orders`, `processing_queue`
* Often prefixed with `temp_`, `staging_`, or `work_`
* Used in ETL (Extract, Transform, Load) processes
* May have relaxed validation rules compared to production tables
* Often dropped or truncated after processing

**Common Use Cases:**

```
-- Data Import Staging
staging_users
id | raw_name    | raw_email       | raw_phone    | status    | errors
--------------------------------------------------------------------
1  | john doe    | JOHN@EMAIL.COM  | 123-456-7890 | pending   | NULL
2  | jane        | invalid-email   | abc-def      | error     | Invalid email, phone
3  | Bob Smith   | bob@email.com   | 555-123-4567 | validated | NULL

-- Batch Processing Queue
processing_queue
id | table_name | record_id | operation | status      | created_at
----------------------------------------------------------------
1  | orders     | 1001      | calculate | pending     | 2025-01-01 09:00
2  | orders     | 1002      | calculate | processing  | 2025-01-01 09:01
3  | orders     | 1003      | calculate | completed   | 2025-01-01 09:02
4  | orders     | 1004      | calculate | failed      | 2025-01-01 09:03

-- Complex Calculation Workspace
temp_monthly_summary
user_id | month    | total_orders | total_amount | discount_applied | final_amount
------------------------------------------------------------------------------
101     | 2025-01  | 5           | 250.00       | 25.00           | 225.00
102     | 2025-01  | 3           | 150.00       | 0.00            | 150.00
```

**Design Consideration**: Staging tables often include status and 
error tracking columns to monitor processing progress. They 
typically mirror the structure of target tables but with 
additional metadata columns for processing control. Many developers 
add timestamps to track processing duration and identify 
bottlenecks.

---

### **Summary of Database Table Types**

**Core Data Tables:**
- **Regular/Entity Tables** - Your main data (Users, Products, 
  Orders). Foundation tables with primary keys representing 
  real-world entities.
- **Lookup/Reference Tables** - Static categorization data 
  (Countries, Statuses). The "one" side of 1:N relationships, 
  referenced by foreign keys.

**Relationship Tables:**
- **Pivot/Bridge Tables** - Handle many-to-many relationships 
  (UserRoles, StudentCourses). Connect two entity tables via 
  foreign keys, may include relationship metadata.
- **Hierarchical/Tree Tables** - Self-referencing for nested 
  structures (Categories, Comments). Use parent_id to create 
  unlimited hierarchy levels.

**System & Process Tables:**
- **Configuration/Settings Tables** - Application behavior 
  control (AppSettings, FeatureFlags). Key-value pairs for 
  runtime configuration.
- **Audit/History Tables** - Change tracking and logs 
  (OrderHistory, ActivityLog). Store historical data for 
  compliance and rollback.
- **Aggregate/Summary Tables** - Precomputed data for 
  performance (MonthlySales). Avoid expensive real-time 
  calculations.
- **Temporary/Staging Tables** - Data processing workspace 
  (staging_imports). Temporary storage for ETL, validation, 
  and bulk operations.
  