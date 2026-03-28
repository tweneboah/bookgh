// ─── Tenant ──────────────────────────────────────────────
export const TENANT_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  PENDING: "pending",
} as const;

export type TenantStatus = (typeof TENANT_STATUS)[keyof typeof TENANT_STATUS];

// ─── Branch ──────────────────────────────────────────────
export const BRANCH_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  CLOSED: "closed",
} as const;

export type BranchStatus = (typeof BRANCH_STATUS)[keyof typeof BRANCH_STATUS];

// ─── User Roles ──────────────────────────────────────────
export const USER_ROLES = {
  SUPER_ADMIN: "superAdmin",
  TENANT_ADMIN: "tenantAdmin",
  BRANCH_MANAGER: "branchManager",
  HOTEL_OWNER: "hotelOwner",
  FINANCE_MANAGER: "financeManager",
  MAINTENANCE_MANAGER: "maintenanceManager",
  TECHNICIAN: "technician",
  EVENT_MANAGER: "eventManager",
  SALES_OFFICER: "salesOfficer",
  OPERATIONS_COORDINATOR: "operationsCoordinator",
  RESTAURANT_MANAGER: "restaurantManager",
  CASHIER: "cashier",
  WAITER: "waiter",
  HOSTESS: "hostess",
  SUPERVISOR: "supervisor",
  HEAD_CHEF: "headChef",
  SOUS_CHEF: "sousChef",
  KITCHEN_STAFF: "kitchenStaff",
  PROCUREMENT_OFFICER: "procurementOfficer",
  HR_MANAGER: "hrManager",
  INVENTORY_MANAGER: "inventoryManager",
  STOREKEEPER: "storekeeper",
  BAR_MANAGER: "barManager",
  BARTENDER: "bartender",
  BAR_CASHIER: "barCashier",
  FRONT_DESK: "frontDesk",
  RESERVATION_OFFICER: "reservationOfficer",
  HOUSEKEEPER: "housekeeper",
  MAINTENANCE: "maintenance",
  ACCOUNTANT: "accountant",
  POS_STAFF: "posStaff",
  EVENT_COORDINATOR: "eventCoordinator",
  CUSTOMER: "customer",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const BAR_PERMISSIONS = {
  EMPLOYEES_MANAGE: "bar.employees.manage",
  ROLES_VIEW: "bar.roles.view",
  OVERVIEW_VIEW: "bar.overview.view",
  MENU_ITEMS_VIEW: "bar.menuItems.view",
  RECIPES_VIEW: "bar.recipes.view",
  INVENTORY_ITEMS_VIEW: "bar.inventoryItems.view",
  INVENTORY_VIEW: "bar.inventory.view",
  ORDER_CREATE: "bar.order.create",
  ORDER_UPDATE: "bar.order.update",
  ORDER_VOID: "bar.order.void",
  STOCK_CONTROL_VIEW: "bar.stockControl.view",
  SHIFT_OPEN: "bar.shift.open",
  SHIFT_CLOSE: "bar.shift.close",
  SHIFTS_VIEW: "bar.shifts.view",
  PRICING_RULES_VIEW: "bar.pricingRules.view",
  SUPPLIERS_VIEW: "bar.suppliers.view",
  PURCHASE_ORDERS_VIEW: "bar.purchaseOrders.view",
  STOCK_MANAGE: "bar.stock.manage",
  STOCK_ADJUST: "bar.stock.adjust",
  STOCK_OVERRIDE_NEGATIVE: "bar.stock.overrideNegative",
  VARIANCE_APPROVE: "bar.variance.approve",
  REPORT_VIEW: "bar.report.view",
  PAYMENTS_VIEW: "bar.payments.view",
  EXPENSES_VIEW: "bar.expenses.view",
  ACCOUNTING_VIEW: "bar.accounting.view",
  FINANCE_VIEW: "bar.finance.view",
} as const;

export type BarPermission =
  (typeof BAR_PERMISSIONS)[keyof typeof BAR_PERMISSIONS];

export const BAR_ROLE_DEFAULT_PERMISSIONS: Record<string, BarPermission[]> = {
  [USER_ROLES.BAR_MANAGER]: Object.values(BAR_PERMISSIONS),
  [USER_ROLES.BARTENDER]: [
    BAR_PERMISSIONS.OVERVIEW_VIEW,
    BAR_PERMISSIONS.MENU_ITEMS_VIEW,
    BAR_PERMISSIONS.RECIPES_VIEW,
    BAR_PERMISSIONS.INVENTORY_ITEMS_VIEW,
    BAR_PERMISSIONS.INVENTORY_VIEW,
    BAR_PERMISSIONS.ORDER_CREATE,
    BAR_PERMISSIONS.ORDER_UPDATE,
    BAR_PERMISSIONS.SHIFT_OPEN,
    BAR_PERMISSIONS.SHIFTS_VIEW,
    BAR_PERMISSIONS.REPORT_VIEW,
  ],
  [USER_ROLES.BAR_CASHIER]: [
    BAR_PERMISSIONS.OVERVIEW_VIEW,
    BAR_PERMISSIONS.MENU_ITEMS_VIEW,
    BAR_PERMISSIONS.INVENTORY_ITEMS_VIEW,
    BAR_PERMISSIONS.INVENTORY_VIEW,
    BAR_PERMISSIONS.ORDER_CREATE,
    BAR_PERMISSIONS.ORDER_UPDATE,
    BAR_PERMISSIONS.ORDER_VOID,
    BAR_PERMISSIONS.SHIFT_OPEN,
    BAR_PERMISSIONS.SHIFT_CLOSE,
    BAR_PERMISSIONS.SHIFTS_VIEW,
    BAR_PERMISSIONS.PAYMENTS_VIEW,
    BAR_PERMISSIONS.REPORT_VIEW,
  ],
};

export const BAR_ROLE_MATRIX = [
  { role: USER_ROLES.BAR_MANAGER, label: "Bar Manager" },
  { role: USER_ROLES.BARTENDER, label: "Bartender" },
  { role: USER_ROLES.BAR_CASHIER, label: "Cashier" },
  { role: USER_ROLES.ACCOUNTANT, label: "Accountant" },
] as const;

export const BAR_ROLE_PERMISSION_MATRIX: Record<string, BarPermission[]> = {
  [USER_ROLES.BAR_MANAGER]: BAR_ROLE_DEFAULT_PERMISSIONS[USER_ROLES.BAR_MANAGER],
  [USER_ROLES.BARTENDER]: BAR_ROLE_DEFAULT_PERMISSIONS[USER_ROLES.BARTENDER],
  [USER_ROLES.BAR_CASHIER]: BAR_ROLE_DEFAULT_PERMISSIONS[USER_ROLES.BAR_CASHIER],
  [USER_ROLES.ACCOUNTANT]: [
    BAR_PERMISSIONS.OVERVIEW_VIEW,
    BAR_PERMISSIONS.REPORT_VIEW,
    BAR_PERMISSIONS.PAYMENTS_VIEW,
    BAR_PERMISSIONS.EXPENSES_VIEW,
    BAR_PERMISSIONS.ACCOUNTING_VIEW,
    BAR_PERMISSIONS.FINANCE_VIEW,
  ],
};

// ─── Restaurant (staff / role matrix) ─────────────────────
export const RESTAURANT_PERMISSIONS = {
  EMPLOYEES_MANAGE: "restaurant.employees.manage",
  ROLES_VIEW: "restaurant.roles.view",
  SUPPLIERS_VIEW: "restaurant.suppliers.view",
  PURCHASE_ORDERS_VIEW: "restaurant.purchaseOrders.view",
  TRANSFERS_VIEW: "restaurant.transfers.view",
  /** Track Main Store → Kitchen → Front House movement flow */
  MOVEMENT_FLOW_VIEW: "restaurant.movementFlow.view",
  STOCK_CONTROL_VIEW: "restaurant.stockControl.view",
  INVENTORY_VIEW: "restaurant.inventory.view",
  RECIPES_VIEW: "restaurant.recipes.view",
  PRODUCTION_VIEW: "restaurant.production.view",
  MENU_ITEMS_VIEW: "restaurant.menuItems.view",
  TABLES_VIEW: "restaurant.tables.view",
  ORDERS_VIEW: "restaurant.orders.view",
  ORDERS_CREATE: "restaurant.orders.create",
  KDS_VIEW: "restaurant.kds.view",
  INVENTORY_SCAN: "restaurant.inventory.scan",
  REPORTS_VIEW: "restaurant.reports.view",
  PAYMENTS_VIEW: "restaurant.payments.view",
  EXPENSES_VIEW: "restaurant.expenses.view",
  ACCOUNTING_VIEW: "restaurant.accounting.view",
  /** Can assign Chart of Accounts (COA) codes to expenses and view accounting reports. */
  ACCOUNTING_MANAGE: "restaurant.accounting.manage",
} as const;

export type RestaurantPermission =
  (typeof RESTAURANT_PERMISSIONS)[keyof typeof RESTAURANT_PERMISSIONS];

export const RESTAURANT_ROLE_MATRIX = [
  { role: USER_ROLES.RESTAURANT_MANAGER, label: "Restaurant Manager" },
  { role: USER_ROLES.HEAD_CHEF, label: "Head Chef" },
  { role: USER_ROLES.SOUS_CHEF, label: "Sous Chef" },
  { role: USER_ROLES.KITCHEN_STAFF, label: "Kitchen Staff" },
  { role: USER_ROLES.CASHIER, label: "Cashier" },
  { role: USER_ROLES.WAITER, label: "Waiter" },
  { role: USER_ROLES.HOSTESS, label: "Hostess" },
  { role: USER_ROLES.SUPERVISOR, label: "Supervisor" },
  { role: USER_ROLES.POS_STAFF, label: "POS Staff" },
  { role: USER_ROLES.STOREKEEPER, label: "Storekeeper" },
  { role: USER_ROLES.PROCUREMENT_OFFICER, label: "Procurement Officer" },
  { role: USER_ROLES.ACCOUNTANT, label: "Accountant" },
] as const;

export const RESTAURANT_ROLE_PERMISSION_MATRIX: Record<
  string,
  RestaurantPermission[]
> = {
  [USER_ROLES.RESTAURANT_MANAGER]: Object.values(RESTAURANT_PERMISSIONS),
  [USER_ROLES.HEAD_CHEF]: [
    RESTAURANT_PERMISSIONS.RECIPES_VIEW,
    RESTAURANT_PERMISSIONS.PRODUCTION_VIEW,
    RESTAURANT_PERMISSIONS.MOVEMENT_FLOW_VIEW,
    RESTAURANT_PERMISSIONS.STOCK_CONTROL_VIEW,
    RESTAURANT_PERMISSIONS.INVENTORY_VIEW,
    RESTAURANT_PERMISSIONS.MENU_ITEMS_VIEW,
    RESTAURANT_PERMISSIONS.KDS_VIEW,
    RESTAURANT_PERMISSIONS.REPORTS_VIEW,
  ],
  [USER_ROLES.SOUS_CHEF]: [
    RESTAURANT_PERMISSIONS.RECIPES_VIEW,
    RESTAURANT_PERMISSIONS.PRODUCTION_VIEW,
    RESTAURANT_PERMISSIONS.MOVEMENT_FLOW_VIEW,
    RESTAURANT_PERMISSIONS.STOCK_CONTROL_VIEW,
    RESTAURANT_PERMISSIONS.INVENTORY_VIEW,
    RESTAURANT_PERMISSIONS.MENU_ITEMS_VIEW,
    RESTAURANT_PERMISSIONS.KDS_VIEW,
  ],
  [USER_ROLES.KITCHEN_STAFF]: [
    RESTAURANT_PERMISSIONS.PRODUCTION_VIEW,
    RESTAURANT_PERMISSIONS.KDS_VIEW,
    RESTAURANT_PERMISSIONS.INVENTORY_SCAN,
  ],
  [USER_ROLES.CASHIER]: [
    RESTAURANT_PERMISSIONS.ORDERS_VIEW,
    RESTAURANT_PERMISSIONS.ORDERS_CREATE,
    RESTAURANT_PERMISSIONS.TABLES_VIEW,
    RESTAURANT_PERMISSIONS.MENU_ITEMS_VIEW,
    RESTAURANT_PERMISSIONS.PAYMENTS_VIEW,
    RESTAURANT_PERMISSIONS.REPORTS_VIEW,
  ],
  [USER_ROLES.WAITER]: [
    RESTAURANT_PERMISSIONS.ORDERS_VIEW,
    RESTAURANT_PERMISSIONS.ORDERS_CREATE,
    RESTAURANT_PERMISSIONS.TABLES_VIEW,
    RESTAURANT_PERMISSIONS.MENU_ITEMS_VIEW,
  ],
  [USER_ROLES.HOSTESS]: [
    RESTAURANT_PERMISSIONS.TABLES_VIEW,
    RESTAURANT_PERMISSIONS.ORDERS_VIEW,
  ],
  [USER_ROLES.SUPERVISOR]: [
    RESTAURANT_PERMISSIONS.ORDERS_VIEW,
    RESTAURANT_PERMISSIONS.ORDERS_CREATE,
    RESTAURANT_PERMISSIONS.TABLES_VIEW,
    RESTAURANT_PERMISSIONS.MENU_ITEMS_VIEW,
    RESTAURANT_PERMISSIONS.KDS_VIEW,
    RESTAURANT_PERMISSIONS.REPORTS_VIEW,
    RESTAURANT_PERMISSIONS.PAYMENTS_VIEW,
  ],
  [USER_ROLES.POS_STAFF]: [
    RESTAURANT_PERMISSIONS.ORDERS_VIEW,
    RESTAURANT_PERMISSIONS.ORDERS_CREATE,
    RESTAURANT_PERMISSIONS.TABLES_VIEW,
    RESTAURANT_PERMISSIONS.MENU_ITEMS_VIEW,
  ],
  [USER_ROLES.STOREKEEPER]: [
    RESTAURANT_PERMISSIONS.SUPPLIERS_VIEW,
    RESTAURANT_PERMISSIONS.PURCHASE_ORDERS_VIEW,
    RESTAURANT_PERMISSIONS.TRANSFERS_VIEW,
    RESTAURANT_PERMISSIONS.MOVEMENT_FLOW_VIEW,
    RESTAURANT_PERMISSIONS.STOCK_CONTROL_VIEW,
    RESTAURANT_PERMISSIONS.INVENTORY_VIEW,
    RESTAURANT_PERMISSIONS.INVENTORY_SCAN,
  ],
  [USER_ROLES.PROCUREMENT_OFFICER]: [
    RESTAURANT_PERMISSIONS.SUPPLIERS_VIEW,
    RESTAURANT_PERMISSIONS.PURCHASE_ORDERS_VIEW,
    RESTAURANT_PERMISSIONS.TRANSFERS_VIEW,
    RESTAURANT_PERMISSIONS.MOVEMENT_FLOW_VIEW,
    RESTAURANT_PERMISSIONS.STOCK_CONTROL_VIEW,
    RESTAURANT_PERMISSIONS.INVENTORY_VIEW,
    RESTAURANT_PERMISSIONS.REPORTS_VIEW,
  ],
  [USER_ROLES.ACCOUNTANT]: [
    RESTAURANT_PERMISSIONS.REPORTS_VIEW,
    RESTAURANT_PERMISSIONS.PAYMENTS_VIEW,
    RESTAURANT_PERMISSIONS.EXPENSES_VIEW,
    RESTAURANT_PERMISSIONS.ACCOUNTING_VIEW,
    RESTAURANT_PERMISSIONS.ACCOUNTING_MANAGE,
  ],
};

// ─── Accommodation (staff / role matrix) ──────────────────
export const ACCOMMODATION_PERMISSIONS = {
  BOOKING_CREATE: "accommodation.booking.create",
  BOOKING_UPDATE: "accommodation.booking.update",
  BOOKING_CANCEL: "accommodation.booking.cancel",
  CHECK_IN: "accommodation.checkIn",
  CHECK_OUT: "accommodation.checkOut",
  GUESTS_VIEW: "accommodation.guests.view",
  GUESTS_EDIT: "accommodation.guests.edit",
  HOUSEKEEPING_VIEW: "accommodation.housekeeping.view",
  HOUSEKEEPING_UPDATE: "accommodation.housekeeping.update",
  LOST_AND_FOUND_MANAGE: "accommodation.lostAndFound.manage",
  MAINTENANCE_VIEW: "accommodation.maintenance.view",
  REPORTS_VIEW: "accommodation.reports.view",
  PAYMENTS_VIEW: "accommodation.payments.view",
  PAYMENTS_PROCESS: "accommodation.payments.process",
  ROOMS_VIEW: "accommodation.rooms.view",
  ROOMS_EDIT: "accommodation.rooms.edit",
  PRICING_VIEW: "accommodation.pricing.view",
  PRICING_EDIT: "accommodation.pricing.edit",
  ROLES_VIEW: "accommodation.roles.view",
  EMPLOYEES_MANAGE: "accommodation.employees.manage",
} as const;

export type AccommodationPermission =
  (typeof ACCOMMODATION_PERMISSIONS)[keyof typeof ACCOMMODATION_PERMISSIONS];

export const ACCOMMODATION_ROLE_MATRIX = [
  { role: USER_ROLES.BRANCH_MANAGER, label: "Branch Manager" },
  { role: USER_ROLES.FRONT_DESK, label: "Front Desk" },
  { role: USER_ROLES.RESERVATION_OFFICER, label: "Reservation Officer" },
  { role: USER_ROLES.HOUSEKEEPER, label: "Housekeeper" },
  { role: USER_ROLES.MAINTENANCE, label: "Maintenance" },
  { role: USER_ROLES.ACCOUNTANT, label: "Accountant" },
] as const;

export const ACCOMMODATION_ROLE_PERMISSION_MATRIX: Record<
  string,
  AccommodationPermission[]
> = {
  [USER_ROLES.BRANCH_MANAGER]: Object.values(ACCOMMODATION_PERMISSIONS),
  [USER_ROLES.FRONT_DESK]: [
    ACCOMMODATION_PERMISSIONS.BOOKING_CREATE,
    ACCOMMODATION_PERMISSIONS.BOOKING_UPDATE,
    ACCOMMODATION_PERMISSIONS.CHECK_IN,
    ACCOMMODATION_PERMISSIONS.CHECK_OUT,
    ACCOMMODATION_PERMISSIONS.GUESTS_VIEW,
    ACCOMMODATION_PERMISSIONS.GUESTS_EDIT,
    ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_VIEW,
    ACCOMMODATION_PERMISSIONS.LOST_AND_FOUND_MANAGE,
    ACCOMMODATION_PERMISSIONS.MAINTENANCE_VIEW,
    ACCOMMODATION_PERMISSIONS.ROOMS_VIEW,
    ACCOMMODATION_PERMISSIONS.PRICING_VIEW,
    ACCOMMODATION_PERMISSIONS.PAYMENTS_VIEW,
    ACCOMMODATION_PERMISSIONS.PAYMENTS_PROCESS,
  ],
  [USER_ROLES.RESERVATION_OFFICER]: [
    ACCOMMODATION_PERMISSIONS.BOOKING_CREATE,
    ACCOMMODATION_PERMISSIONS.BOOKING_UPDATE,
    ACCOMMODATION_PERMISSIONS.GUESTS_VIEW,
    ACCOMMODATION_PERMISSIONS.GUESTS_EDIT,
    ACCOMMODATION_PERMISSIONS.ROOMS_VIEW,
    ACCOMMODATION_PERMISSIONS.PRICING_VIEW,
    ACCOMMODATION_PERMISSIONS.REPORTS_VIEW,
  ],
  [USER_ROLES.HOUSEKEEPER]: [
    ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_VIEW,
    ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_UPDATE,
    ACCOMMODATION_PERMISSIONS.ROOMS_VIEW,
    ACCOMMODATION_PERMISSIONS.LOST_AND_FOUND_MANAGE,
  ],
  [USER_ROLES.MAINTENANCE]: [
    ACCOMMODATION_PERMISSIONS.MAINTENANCE_VIEW,
    ACCOMMODATION_PERMISSIONS.ROOMS_VIEW,
  ],
  [USER_ROLES.ACCOUNTANT]: [
    ACCOMMODATION_PERMISSIONS.REPORTS_VIEW,
    ACCOMMODATION_PERMISSIONS.PAYMENTS_VIEW,
    ACCOMMODATION_PERMISSIONS.PAYMENTS_PROCESS,
  ],
};

// ─── Conference Hall (staff / role matrix) ─────────────────
export const CONFERENCE_PERMISSIONS = {
  EMPLOYEES_MANAGE: "conference.employees.manage",
  ROLES_VIEW: "conference.roles.view",
  OVERVIEW_VIEW: "conference.overview.view",
  EVENT_HALLS_VIEW: "conference.eventHalls.view",
  EVENT_BOOKINGS_VIEW: "conference.eventBookings.view",
  EVENT_CALENDAR_VIEW: "conference.eventCalendar.view",
  PROPOSALS_VIEW: "conference.proposals.view",
  RESOURCES_VIEW: "conference.resources.view",
  REPORTS_VIEW: "conference.reports.view",
  PAYMENTS_VIEW: "conference.payments.view",
  EXPENSES_VIEW: "conference.expenses.view",
  ACCOUNTING_VIEW: "conference.accounting.view",
} as const;

export type ConferencePermission =
  (typeof CONFERENCE_PERMISSIONS)[keyof typeof CONFERENCE_PERMISSIONS];

export const CONFERENCE_ROLE_MATRIX = [
  { role: USER_ROLES.EVENT_MANAGER, label: "Event Manager" },
  { role: USER_ROLES.SALES_OFFICER, label: "Sales Officer" },
  { role: USER_ROLES.OPERATIONS_COORDINATOR, label: "Operations Coordinator" },
  { role: USER_ROLES.EVENT_COORDINATOR, label: "Event Coordinator" },
  { role: USER_ROLES.ACCOUNTANT, label: "Accountant" },
] as const;

export const CONFERENCE_ROLE_PERMISSION_MATRIX: Record<
  string,
  ConferencePermission[]
> = {
  [USER_ROLES.EVENT_MANAGER]: Object.values(CONFERENCE_PERMISSIONS),
  [USER_ROLES.SALES_OFFICER]: [
    CONFERENCE_PERMISSIONS.OVERVIEW_VIEW,
    CONFERENCE_PERMISSIONS.EVENT_HALLS_VIEW,
    CONFERENCE_PERMISSIONS.EVENT_BOOKINGS_VIEW,
    CONFERENCE_PERMISSIONS.EVENT_CALENDAR_VIEW,
    CONFERENCE_PERMISSIONS.PROPOSALS_VIEW,
    CONFERENCE_PERMISSIONS.RESOURCES_VIEW,
    CONFERENCE_PERMISSIONS.REPORTS_VIEW,
  ],
  [USER_ROLES.OPERATIONS_COORDINATOR]: [
    CONFERENCE_PERMISSIONS.OVERVIEW_VIEW,
    CONFERENCE_PERMISSIONS.EVENT_HALLS_VIEW,
    CONFERENCE_PERMISSIONS.EVENT_BOOKINGS_VIEW,
    CONFERENCE_PERMISSIONS.EVENT_CALENDAR_VIEW,
    CONFERENCE_PERMISSIONS.RESOURCES_VIEW,
    CONFERENCE_PERMISSIONS.REPORTS_VIEW,
  ],
  [USER_ROLES.EVENT_COORDINATOR]: [
    CONFERENCE_PERMISSIONS.OVERVIEW_VIEW,
    CONFERENCE_PERMISSIONS.EVENT_HALLS_VIEW,
    CONFERENCE_PERMISSIONS.EVENT_BOOKINGS_VIEW,
    CONFERENCE_PERMISSIONS.EVENT_CALENDAR_VIEW,
    CONFERENCE_PERMISSIONS.PROPOSALS_VIEW,
    CONFERENCE_PERMISSIONS.RESOURCES_VIEW,
  ],
  [USER_ROLES.ACCOUNTANT]: [
    CONFERENCE_PERMISSIONS.OVERVIEW_VIEW,
    CONFERENCE_PERMISSIONS.REPORTS_VIEW,
    CONFERENCE_PERMISSIONS.PAYMENTS_VIEW,
    CONFERENCE_PERMISSIONS.EXPENSES_VIEW,
    CONFERENCE_PERMISSIONS.ACCOUNTING_VIEW,
  ],
};

// ─── Pool (staff / role matrix) ───────────────────────────
export const POOL_PERMISSIONS = {
  EMPLOYEES_MANAGE: "pool.employees.manage",
  ROLES_VIEW: "pool.roles.view",
  OVERVIEW_VIEW: "pool.overview.view",
  AREAS_VIEW: "pool.areas.view",
  BOOKINGS_VIEW: "pool.bookings.view",
  MAINTENANCE_VIEW: "pool.maintenance.view",
  INVOICES_VIEW: "pool.invoices.view",
  PAYMENTS_VIEW: "pool.payments.view",
  EXPENSES_VIEW: "pool.expenses.view",
  ACCOUNTING_VIEW: "pool.accounting.view",
  REPORTS_VIEW: "pool.reports.view",
} as const;

export type PoolPermission =
  (typeof POOL_PERMISSIONS)[keyof typeof POOL_PERMISSIONS];

export const POOL_ROLE_MATRIX = [
  { role: USER_ROLES.BRANCH_MANAGER, label: "Branch Manager" },
  { role: USER_ROLES.ACCOUNTANT, label: "Accountant" },
  { role: USER_ROLES.MAINTENANCE_MANAGER, label: "Maintenance Manager" },
  { role: USER_ROLES.TECHNICIAN, label: "Technician" },
] as const;

export const POOL_ROLE_PERMISSION_MATRIX: Record<
  string,
  PoolPermission[]
> = {
  [USER_ROLES.BRANCH_MANAGER]: Object.values(POOL_PERMISSIONS),
  [USER_ROLES.ACCOUNTANT]: [
    POOL_PERMISSIONS.OVERVIEW_VIEW,
    POOL_PERMISSIONS.REPORTS_VIEW,
    POOL_PERMISSIONS.PAYMENTS_VIEW,
    POOL_PERMISSIONS.EXPENSES_VIEW,
    POOL_PERMISSIONS.ACCOUNTING_VIEW,
    POOL_PERMISSIONS.INVOICES_VIEW,
  ],
  [USER_ROLES.MAINTENANCE_MANAGER]: [
    POOL_PERMISSIONS.OVERVIEW_VIEW,
    POOL_PERMISSIONS.AREAS_VIEW,
    POOL_PERMISSIONS.BOOKINGS_VIEW,
    POOL_PERMISSIONS.MAINTENANCE_VIEW,
    POOL_PERMISSIONS.REPORTS_VIEW,
  ],
  [USER_ROLES.TECHNICIAN]: [
    POOL_PERMISSIONS.OVERVIEW_VIEW,
    POOL_PERMISSIONS.AREAS_VIEW,
    POOL_PERMISSIONS.MAINTENANCE_VIEW,
  ],
};

// ─── Playground (staff / role matrix) ────────────────────
export const PLAYGROUND_PERMISSIONS = {
  EMPLOYEES_MANAGE: "playground.employees.manage",
  ROLES_VIEW: "playground.roles.view",
  OVERVIEW_VIEW: "playground.overview.view",
  AREAS_VIEW: "playground.areas.view",
  EQUIPMENT_VIEW: "playground.equipment.view",
  MAINTENANCE_VIEW: "playground.maintenance.view",
  BOOKINGS_VIEW: "playground.bookings.view",
  INVOICES_VIEW: "playground.invoices.view",
  PAYMENTS_VIEW: "playground.payments.view",
  EXPENSES_VIEW: "playground.expenses.view",
  ACCOUNTING_VIEW: "playground.accounting.view",
  REPORTS_VIEW: "playground.reports.view",
} as const;

export const PLAYGROUND_BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checkedIn",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "noShow",
} as const;

export type PlaygroundBookingStatus =
  (typeof PLAYGROUND_BOOKING_STATUS)[keyof typeof PLAYGROUND_BOOKING_STATUS];

export type PlaygroundPermission =
  (typeof PLAYGROUND_PERMISSIONS)[keyof typeof PLAYGROUND_PERMISSIONS];

export const PLAYGROUND_ROLE_MATRIX = [
  { role: USER_ROLES.BRANCH_MANAGER, label: "Branch Manager" },
  { role: USER_ROLES.ACCOUNTANT, label: "Accountant" },
  { role: USER_ROLES.MAINTENANCE_MANAGER, label: "Maintenance Manager" },
  { role: USER_ROLES.TECHNICIAN, label: "Technician" },
] as const;

export const PLAYGROUND_ROLE_PERMISSION_MATRIX: Record<
  string,
  PlaygroundPermission[]
> = {
  [USER_ROLES.BRANCH_MANAGER]: Object.values(PLAYGROUND_PERMISSIONS),
  [USER_ROLES.ACCOUNTANT]: [
    PLAYGROUND_PERMISSIONS.OVERVIEW_VIEW,
    PLAYGROUND_PERMISSIONS.BOOKINGS_VIEW,
    PLAYGROUND_PERMISSIONS.REPORTS_VIEW,
    PLAYGROUND_PERMISSIONS.PAYMENTS_VIEW,
    PLAYGROUND_PERMISSIONS.EXPENSES_VIEW,
    PLAYGROUND_PERMISSIONS.ACCOUNTING_VIEW,
    PLAYGROUND_PERMISSIONS.INVOICES_VIEW,
  ],
  [USER_ROLES.MAINTENANCE_MANAGER]: [
    PLAYGROUND_PERMISSIONS.OVERVIEW_VIEW,
    PLAYGROUND_PERMISSIONS.AREAS_VIEW,
    PLAYGROUND_PERMISSIONS.EQUIPMENT_VIEW,
    PLAYGROUND_PERMISSIONS.MAINTENANCE_VIEW,
    PLAYGROUND_PERMISSIONS.BOOKINGS_VIEW,
    PLAYGROUND_PERMISSIONS.REPORTS_VIEW,
  ],
  [USER_ROLES.TECHNICIAN]: [
    PLAYGROUND_PERMISSIONS.OVERVIEW_VIEW,
    PLAYGROUND_PERMISSIONS.AREAS_VIEW,
    PLAYGROUND_PERMISSIONS.EQUIPMENT_VIEW,
    PLAYGROUND_PERMISSIONS.MAINTENANCE_VIEW,
    PLAYGROUND_PERMISSIONS.BOOKINGS_VIEW,
  ],
};

// ─── Finance (staff / role matrix) ───────────────────────
export const FINANCE_PERMISSIONS = {
  EMPLOYEES_MANAGE: "finance.employees.manage",
  ROLES_VIEW: "finance.roles.view",
  INVOICES_VIEW: "finance.invoices.view",
  CORPORATE_REPORTS_VIEW: "finance.corporateReports.view",
  FINANCIAL_REPORTS_VIEW: "finance.financialReports.view",
  PAYMENTS_VIEW: "finance.payments.view",
  EXPENSES_VIEW: "finance.expenses.view",
  DEPARTMENT_PL_VIEW: "finance.departmentPL.view",
} as const;

export type FinancePermission =
  (typeof FINANCE_PERMISSIONS)[keyof typeof FINANCE_PERMISSIONS];

export const FINANCE_ROLE_MATRIX = [
  { role: USER_ROLES.BRANCH_MANAGER, label: "Branch Manager" },
  { role: USER_ROLES.FINANCE_MANAGER, label: "Finance Manager" },
  { role: USER_ROLES.ACCOUNTANT, label: "Accountant" },
  { role: USER_ROLES.HOTEL_OWNER, label: "Hotel Owner" },
] as const;

export const FINANCE_ROLE_PERMISSION_MATRIX: Record<
  string,
  FinancePermission[]
> = {
  [USER_ROLES.BRANCH_MANAGER]: Object.values(FINANCE_PERMISSIONS),
  [USER_ROLES.FINANCE_MANAGER]: Object.values(FINANCE_PERMISSIONS),
  [USER_ROLES.HOTEL_OWNER]: Object.values(FINANCE_PERMISSIONS),
  [USER_ROLES.ACCOUNTANT]: [
    FINANCE_PERMISSIONS.INVOICES_VIEW,
    FINANCE_PERMISSIONS.CORPORATE_REPORTS_VIEW,
    FINANCE_PERMISSIONS.FINANCIAL_REPORTS_VIEW,
    FINANCE_PERMISSIONS.PAYMENTS_VIEW,
    FINANCE_PERMISSIONS.EXPENSES_VIEW,
    FINANCE_PERMISSIONS.DEPARTMENT_PL_VIEW,
  ],
};

// ─── Maintenance Department (staff / role matrix) ─────────
export const MAINTENANCE_DEPT_PERMISSIONS = {
  EMPLOYEES_MANAGE: "maintenanceDept.employees.manage",
  ROLES_VIEW: "maintenanceDept.roles.view",
  TICKETS_VIEW: "maintenanceDept.tickets.view",
  ASSETS_VIEW: "maintenanceDept.assets.view",
  REPORTS_VIEW: "maintenanceDept.reports.view",
  PAYMENTS_VIEW: "maintenanceDept.payments.view",
  EXPENSES_VIEW: "maintenanceDept.expenses.view",
  ACCOUNTING_VIEW: "maintenanceDept.accounting.view",
} as const;

export type MaintenanceDeptPermission =
  (typeof MAINTENANCE_DEPT_PERMISSIONS)[keyof typeof MAINTENANCE_DEPT_PERMISSIONS];

export const MAINTENANCE_DEPT_ROLE_MATRIX = [
  { role: USER_ROLES.BRANCH_MANAGER, label: "Branch Manager" },
  { role: USER_ROLES.MAINTENANCE_MANAGER, label: "Maintenance Manager" },
  { role: USER_ROLES.TECHNICIAN, label: "Technician" },
  { role: USER_ROLES.ACCOUNTANT, label: "Accountant" },
  { role: USER_ROLES.MAINTENANCE, label: "Maintenance" },
] as const;

export const MAINTENANCE_DEPT_ROLE_PERMISSION_MATRIX: Record<
  string,
  MaintenanceDeptPermission[]
> = {
  [USER_ROLES.BRANCH_MANAGER]: Object.values(MAINTENANCE_DEPT_PERMISSIONS),
  [USER_ROLES.MAINTENANCE_MANAGER]: Object.values(MAINTENANCE_DEPT_PERMISSIONS),
  [USER_ROLES.TECHNICIAN]: [
    MAINTENANCE_DEPT_PERMISSIONS.TICKETS_VIEW,
    MAINTENANCE_DEPT_PERMISSIONS.ASSETS_VIEW,
    MAINTENANCE_DEPT_PERMISSIONS.REPORTS_VIEW,
  ],
  [USER_ROLES.ACCOUNTANT]: [
    MAINTENANCE_DEPT_PERMISSIONS.REPORTS_VIEW,
    MAINTENANCE_DEPT_PERMISSIONS.PAYMENTS_VIEW,
    MAINTENANCE_DEPT_PERMISSIONS.EXPENSES_VIEW,
    MAINTENANCE_DEPT_PERMISSIONS.ACCOUNTING_VIEW,
  ],
  [USER_ROLES.MAINTENANCE]: [
    MAINTENANCE_DEPT_PERMISSIONS.TICKETS_VIEW,
    MAINTENANCE_DEPT_PERMISSIONS.ASSETS_VIEW,
    MAINTENANCE_DEPT_PERMISSIONS.REPORTS_VIEW,
  ],
};

// ─── Subscription ────────────────────────────────────────
export const BILLING_CYCLE = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export type BillingCycle = (typeof BILLING_CYCLE)[keyof typeof BILLING_CYCLE];

export const SUBSCRIPTION_STATUS = {
  TRIAL: "trial",
  ACTIVE: "active",
  PAST_DUE: "pastDue",
  SUSPENDED: "suspended",
  CANCELLED: "cancelled",
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

// ─── Room ────────────────────────────────────────────────
export const ROOM_STATUS = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  OCCUPIED: "occupied",
  CLEANING: "cleaning",
  MAINTENANCE: "maintenance",
  OUT_OF_SERVICE: "outOfService",
} as const;

export type RoomStatus = (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];

export const BED_TYPE = {
  SINGLE: "single",
  DOUBLE: "double",
  QUEEN: "queen",
  KING: "king",
  TWIN: "twin",
} as const;

export type BedType = (typeof BED_TYPE)[keyof typeof BED_TYPE];

// ─── Pricing ─────────────────────────────────────────────
export const PRICING_RULE_TYPE = {
  SEASONAL: "seasonal",
  WEEKEND: "weekend",
  HOLIDAY: "holiday",
  SPECIAL: "special",
} as const;

export type PricingRuleType =
  (typeof PRICING_RULE_TYPE)[keyof typeof PRICING_RULE_TYPE];

export const MODIFIER_TYPE = {
  PERCENTAGE: "percentage",
  FIXED: "fixed",
} as const;

export type ModifierType = (typeof MODIFIER_TYPE)[keyof typeof MODIFIER_TYPE];

// ─── Guest ───────────────────────────────────────────────
export const ID_TYPE = {
  PASSPORT: "passport",
  NATIONAL_ID: "nationalId",
  DRIVER_LICENSE: "driverLicense",
  OTHER: "other",
} as const;

export type IdType = (typeof ID_TYPE)[keyof typeof ID_TYPE];

export const VIP_TIER = {
  NONE: "none",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
} as const;

export type VipTier = (typeof VIP_TIER)[keyof typeof VIP_TIER];

// ─── Booking ─────────────────────────────────────────────
export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checkedIn",
  CHECKED_OUT: "checkedOut",
  CANCELLED: "cancelled",
  NO_SHOW: "noShow",
} as const;

export type BookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_SOURCE = {
  WALK_IN: "walkIn",
  ONLINE: "online",
  PHONE: "phone",
  AGENT: "agent",
  CORPORATE: "corporate",
} as const;

export type BookingSource =
  (typeof BOOKING_SOURCE)[keyof typeof BOOKING_SOURCE];

// ─── Invoice ─────────────────────────────────────────────
export const INVOICE_STATUS = {
  DRAFT: "draft",
  ISSUED: "issued",
  PARTIALLY_PAID: "partiallyPaid",
  PAID: "paid",
  REFUNDED: "refunded",
  VOID: "void",
} as const;

export type InvoiceStatus =
  (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

// ─── Payment ─────────────────────────────────────────────
export const PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
  MOBILE_MONEY: "mobileMoney",
  BANK_TRANSFER: "bankTransfer",
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// ─── Event ───────────────────────────────────────────────
export const EVENT_TYPE = {
  WEDDING: "wedding",
  CONFERENCE: "conference",
  MEETING: "meeting",
  CORPORATE_RETREAT: "corporateRetreat",
  BIRTHDAY: "birthday",
  BANQUET: "banquet",
  TRAINING: "training",
  OTHER: "other",
} as const;

export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

export const EVENT_BOOKING_STATUS = {
  INQUIRY: "inquiry",
  QUOTED: "quoted",
  CONFIRMED: "confirmed",
  DEPOSIT_PAID: "depositPaid",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type EventBookingStatus =
  (typeof EVENT_BOOKING_STATUS)[keyof typeof EVENT_BOOKING_STATUS];

export const EVENT_HALL_STATUS = {
  AVAILABLE: "available",
  BOOKED: "booked",
  MAINTENANCE: "maintenance",
} as const;

export type EventHallStatus =
  (typeof EVENT_HALL_STATUS)[keyof typeof EVENT_HALL_STATUS];

export const LAYOUT_TYPE = {
  THEATER: "theater",
  BANQUET: "banquet",
  CLASSROOM: "classroom",
  U_SHAPE: "uShape",
} as const;

export type LayoutType = (typeof LAYOUT_TYPE)[keyof typeof LAYOUT_TYPE];

export const EVENT_RESOURCE_TYPE = {
  EQUIPMENT: "equipment",
  CATERING: "catering",
  DECORATION: "decoration",
  STAFFING: "staffing",
  SECURITY: "security",
} as const;

export type EventResourceType =
  (typeof EVENT_RESOURCE_TYPE)[keyof typeof EVENT_RESOURCE_TYPE];

export const RESOURCE_CONDITION = {
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor",
  OUT_OF_SERVICE: "outOfService",
} as const;

export type ResourceCondition =
  (typeof RESOURCE_CONDITION)[keyof typeof RESOURCE_CONDITION];

/** How the resource's unit price is applied: per item, per hour, or per day. */
export const RESOURCE_PRICE_UNIT = {
  PER_UNIT: "perUnit",
  PER_HOUR: "perHour",
  PER_DAY: "perDay",
} as const;

export type ResourcePriceUnit =
  (typeof RESOURCE_PRICE_UNIT)[keyof typeof RESOURCE_PRICE_UNIT];

// ─── Housekeeping ────────────────────────────────────────
export const HOUSEKEEPING_TASK_TYPE = {
  CLEANING: "cleaning",
  INSPECTION: "inspection",
  TURNOVER: "turnover",
  DEEP_CLEAN: "deepClean",
  LINEN_CHANGE: "linenChange",
} as const;

export type HousekeepingTaskType =
  (typeof HOUSEKEEPING_TASK_TYPE)[keyof typeof HOUSEKEEPING_TASK_TYPE];

export const HOUSEKEEPING_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  INSPECTED: "inspected",
} as const;

export type HousekeepingStatus =
  (typeof HOUSEKEEPING_STATUS)[keyof typeof HOUSEKEEPING_STATUS];

export const LOST_FOUND_STATUS = {
  FOUND: "found",
  CLAIMED: "claimed",
  DISPOSED: "disposed",
} as const;

export type LostFoundStatus =
  (typeof LOST_FOUND_STATUS)[keyof typeof LOST_FOUND_STATUS];

// ─── Maintenance ─────────────────────────────────────────
export const MAINTENANCE_CATEGORY = {
  PLUMBING: "plumbing",
  ELECTRICAL: "electrical",
  HVAC: "hvac",
  FURNITURE: "furniture",
  APPLIANCE: "appliance",
  STRUCTURAL: "structural",
  OTHER: "other",
} as const;

export type MaintenanceCategory =
  (typeof MAINTENANCE_CATEGORY)[keyof typeof MAINTENANCE_CATEGORY];

export const MAINTENANCE_STATUS = {
  OPEN: "open",
  ASSIGNED: "assigned",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  CLOSED: "closed",
} as const;

export type MaintenanceStatus =
  (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS];

export const ASSET_CONDITION = {
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor",
  OUT_OF_SERVICE: "outOfService",
} as const;

export type AssetCondition =
  (typeof ASSET_CONDITION)[keyof typeof ASSET_CONDITION];

// ─── Priority (shared) ──────────────────────────────────
export const PRIORITY = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
  CRITICAL: "critical",
} as const;

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

// ─── POS ─────────────────────────────────────────────────
export const POS_ORDER_STATUS = {
  PENDING: "pending",
  PREPARING: "preparing",
  READY: "ready",
  SERVED: "served",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type PosOrderStatus =
  (typeof POS_ORDER_STATUS)[keyof typeof POS_ORDER_STATUS];

export const POS_TABLE_STATUS = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  RESERVED: "reserved",
} as const;

export type PosTableStatus =
  (typeof POS_TABLE_STATUS)[keyof typeof POS_TABLE_STATUS];

export const POS_PAYMENT_STATUS = {
  UNPAID: "unpaid",
  PAID: "paid",
  PARTIAL: "partial",
} as const;

export type PosPaymentStatus =
  (typeof POS_PAYMENT_STATUS)[keyof typeof POS_PAYMENT_STATUS];

export const POS_ORDER_CHANNEL = {
  DINE_IN: "dineIn",
  TAKEAWAY: "takeaway",
  ROOM_SERVICE: "roomService",
} as const;

export type PosOrderChannel =
  (typeof POS_ORDER_CHANNEL)[keyof typeof POS_ORDER_CHANNEL];

export const POS_KOT_STATUS = {
  NOT_SENT: "notSent",
  PENDING: "pending",
  PREPARING: "preparing",
  READY: "ready",
  SERVED: "served",
} as const;

export type PosKotStatus =
  (typeof POS_KOT_STATUS)[keyof typeof POS_KOT_STATUS];

export const INVENTORY_MOVEMENT_TYPE = {
  OPENING: "opening",
  RESTOCK: "restock",
  SALE: "sale",
  WASTAGE: "wastage",
  ADJUSTMENT: "adjustment",
  REVERSAL: "reversal",
  CLOSING: "closing",
} as const;

export type InventoryMovementType =
  (typeof INVENTORY_MOVEMENT_TYPE)[keyof typeof INVENTORY_MOVEMENT_TYPE];

export const SUPPLIER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BLACKLISTED: "blacklisted",
} as const;

export type SupplierStatus =
  (typeof SUPPLIER_STATUS)[keyof typeof SUPPLIER_STATUS];

export const PROCUREMENT_ORDER_STATUS = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pendingApproval",
  APPROVED: "approved",
  ORDERED: "ordered",
  PARTIALLY_RECEIVED: "partiallyReceived",
  RECEIVED: "received",
  CANCELLED: "cancelled",
} as const;

export type ProcurementOrderStatus =
  (typeof PROCUREMENT_ORDER_STATUS)[keyof typeof PROCUREMENT_ORDER_STATUS];

export const TRANSFER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  IN_TRANSIT: "inTransit",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const;

export type TransferStatus =
  (typeof TRANSFER_STATUS)[keyof typeof TRANSFER_STATUS];

/** Within-branch stock locations: Main Store → Kitchen → Front House */
export const STOCK_LOCATION = {
  MAIN_STORE: "mainStore",
  KITCHEN: "kitchen",
  FRONT_HOUSE: "frontHouse",
} as const;

export type StockLocation =
  (typeof STOCK_LOCATION)[keyof typeof STOCK_LOCATION];

/** Status for station transfers (within-branch location moves) */
export const STATION_TRANSFER_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type StationTransferStatus =
  (typeof STATION_TRANSFER_STATUS)[keyof typeof STATION_TRANSFER_STATUS];

// ─── Staff ───────────────────────────────────────────────
export const SHIFT_TYPE = {
  MORNING: "morning",
  AFTERNOON: "afternoon",
  NIGHT: "night",
} as const;

export type ShiftType = (typeof SHIFT_TYPE)[keyof typeof SHIFT_TYPE];

export const SHIFT_STATUS = {
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  MISSED: "missed",
  SWAPPED: "swapped",
} as const;

export type ShiftStatus = (typeof SHIFT_STATUS)[keyof typeof SHIFT_STATUS];

export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
  HALF_DAY: "halfDay",
} as const;

export type AttendanceStatus =
  (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

export const PERFORMANCE_RATING = {
  EXCELLENT: "excellent",
  GOOD: "good",
  SATISFACTORY: "satisfactory",
  NEEDS_IMPROVEMENT: "needsImprovement",
  POOR: "poor",
} as const;

export type PerformanceRating =
  (typeof PERFORMANCE_RATING)[keyof typeof PERFORMANCE_RATING];

// ─── Expense ─────────────────────────────────────────────
export const EXPENSE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type ExpenseStatus =
  (typeof EXPENSE_STATUS)[keyof typeof EXPENSE_STATUS];

// ─── Platform Log ────────────────────────────────────────
export const LOG_LEVEL = {
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  CRITICAL: "critical",
} as const;

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

// ─── Installment Status (Events) ────────────────────────
export const INSTALLMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  OVERDUE: "overdue",
} as const;

export type InstallmentStatus =
  (typeof INSTALLMENT_STATUS)[keyof typeof INSTALLMENT_STATUS];

// ─── Checklist Status (Events) ──────────────────────────
export const CHECKLIST_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
} as const;

export type ChecklistStatus =
  (typeof CHECKLIST_STATUS)[keyof typeof CHECKLIST_STATUS];

// ─── Department ──────────────────────────────────────────
export const DEPARTMENT = {
  ACCOMMODATION: "accommodation",
  RESTAURANT: "restaurant",
  CONFERENCE: "conference",
  BAR: "bar",
  GYM: "gym",
  POOL: "pool",
  PLAYGROUND: "playground",
  HOUSEKEEPING: "housekeeping",
  MAINTENANCE: "maintenance",
  STAFF: "staff",
  STAFF_MANAGEMENT: "staffManagement",
  INVENTORY_PROCUREMENT: "inventoryProcurement",
  FINANCE_ACCOUNTING: "financeAccounting",
  GENERAL: "general",
} as const;

export type Department = (typeof DEPARTMENT)[keyof typeof DEPARTMENT];

// ─── Chart of Accounts (Phase 1: restaurant revenue & expense) ───
export const COA_TYPE = { REVENUE: "revenue", EXPENSE: "expense" } as const;
export type CoaType = (typeof COA_TYPE)[keyof typeof COA_TYPE];

/** Restaurant (and general) account codes for Orders → revenue, Expenses → expense accounts. */
export const COA_ACCOUNTS = [
  // Revenue (orders)
  { code: "restaurant-sales", label: "Restaurant – sales", type: COA_TYPE.REVENUE as CoaType, department: DEPARTMENT.RESTAURANT },
  { code: "restaurant-food", label: "Restaurant – food sales", type: COA_TYPE.REVENUE as CoaType, department: DEPARTMENT.RESTAURANT },
  { code: "restaurant-beverage", label: "Restaurant – beverage sales", type: COA_TYPE.REVENUE as CoaType, department: DEPARTMENT.RESTAURANT },
  // Expense (expenses)
  { code: "restaurant-food-cost", label: "Restaurant – food cost", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.RESTAURANT },
  { code: "restaurant-labour", label: "Restaurant – labour", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.RESTAURANT },
  { code: "restaurant-utilities", label: "Restaurant – utilities", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.RESTAURANT },
  { code: "restaurant-supplies", label: "Restaurant – supplies", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.RESTAURANT },
  { code: "restaurant-maintenance", label: "Restaurant – maintenance", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.RESTAURANT },
  { code: "restaurant-marketing", label: "Restaurant – marketing", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.RESTAURANT },
  { code: "restaurant-other", label: "Restaurant – other", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.RESTAURANT },
  // Conference / Events expense accounts
  { code: "conference-venue", label: "Conference – venue & hall", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.CONFERENCE },
  { code: "conference-equipment", label: "Conference – equipment & AV", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.CONFERENCE },
  { code: "conference-catering", label: "Conference – catering", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.CONFERENCE },
  { code: "conference-staffing", label: "Conference – staffing", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.CONFERENCE },
  { code: "conference-marketing", label: "Conference – marketing", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.CONFERENCE },
  { code: "conference-utilities", label: "Conference – utilities", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.CONFERENCE },
  { code: "conference-equipment-rental", label: "Conference – equipment rental", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.CONFERENCE },
  { code: "conference-other", label: "Conference – other", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.CONFERENCE },
  // Pool – revenue & expense
  { code: "pool-bookings", label: "Pool – bookings & access", type: COA_TYPE.REVENUE as CoaType, department: DEPARTMENT.POOL },
  { code: "pool-maintenance", label: "Pool – maintenance", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.POOL },
  { code: "pool-supplies", label: "Pool – supplies & chemicals", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.POOL },
  { code: "pool-labour", label: "Pool – labour", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.POOL },
  { code: "pool-utilities", label: "Pool – utilities", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.POOL },
  { code: "pool-equipment", label: "Pool – equipment", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.POOL },
  { code: "pool-other", label: "Pool – other", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.POOL },
  // Playground – revenue & expense
  { code: "playground-access", label: "Playground – access & bookings", type: COA_TYPE.REVENUE as CoaType, department: DEPARTMENT.PLAYGROUND },
  { code: "playground-maintenance", label: "Playground – maintenance", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.PLAYGROUND },
  { code: "playground-equipment", label: "Playground – equipment & repairs", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.PLAYGROUND },
  { code: "playground-supplies", label: "Playground – supplies", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.PLAYGROUND },
  { code: "playground-other", label: "Playground – other", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.PLAYGROUND },
  // Staff salary (any department)
  { code: "staff-salaries", label: "Staff salaries", type: COA_TYPE.EXPENSE as CoaType, department: DEPARTMENT.GENERAL },
] as const;

export const COA_REVENUE_CODES = COA_ACCOUNTS.filter((a) => a.type === COA_TYPE.REVENUE).map((a) => a.code);
export const COA_EXPENSE_CODES = COA_ACCOUNTS.filter((a) => a.type === COA_TYPE.EXPENSE).map((a) => a.code);

// ─── Room Charge ─────────────────────────────────────────
export const ROOM_CHARGE_TYPE = {
  MINIBAR: "minibar",
  LAUNDRY: "laundry",
  ROOM_SERVICE: "roomService",
  SPA: "spa",
  TELEPHONE: "telephone",
  PARKING: "parking",
  EXTRA_BED: "extraBed",
  OTHER: "other",
} as const;

export type RoomChargeType =
  (typeof ROOM_CHARGE_TYPE)[keyof typeof ROOM_CHARGE_TYPE];

// ─── Corporate Account Status ────────────────────────────
export const CORPORATE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
} as const;

export type CorporateStatus =
  (typeof CORPORATE_STATUS)[keyof typeof CORPORATE_STATUS];

// ─── Pool ────────────────────────────────────────────────
export const POOL_AREA_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  MAINTENANCE: "maintenance",
  RESERVED: "reserved",
} as const;

export type PoolAreaStatus =
  (typeof POOL_AREA_STATUS)[keyof typeof POOL_AREA_STATUS];

export const POOL_AREA_TYPE = {
  MAIN: "main",
  KIDS: "kids",
  HEATED: "heated",
  INFINITY: "infinity",
  INDOOR: "indoor",
  OUTDOOR: "outdoor",
  LAP: "lap",
  OTHER: "other",
} as const;

export const POOL_BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checkedIn",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "noShow",
} as const;

export type PoolBookingStatus =
  (typeof POOL_BOOKING_STATUS)[keyof typeof POOL_BOOKING_STATUS];

export const POOL_MAINTENANCE_TYPE = {
  CLEANING: "cleaning",
  CHEMICAL: "chemical",
  EQUIPMENT: "equipment",
  INSPECTION: "inspection",
  REPAIR: "repair",
  FILTER: "filter",
  OTHER: "other",
} as const;

export const POOL_MAINTENANCE_STATUS = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  POSTPONED: "postponed",
  CANCELLED: "cancelled",
} as const;

// ─── Playground ───────────────────────────────────────────
export const PLAYGROUND_AREA_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  MAINTENANCE: "maintenance",
  RESERVED: "reserved",
} as const;

export type PlaygroundAreaStatus =
  (typeof PLAYGROUND_AREA_STATUS)[keyof typeof PLAYGROUND_AREA_STATUS];

export const PLAYGROUND_AREA_TYPE = {
  INDOOR: "indoor",
  OUTDOOR: "outdoor",
  COVERED: "covered",
  KIDS: "kids",
  GENERAL: "general",
  OTHER: "other",
} as const;

export const PLAYGROUND_EQUIPMENT_TYPE = {
  SLIDE: "slide",
  SEESAW: "seesaw",
  SWING: "swing",
  CLIMBING: "climbing",
  SANDBOX: "sandbox",
  SPRING_RIDER: "springRider",
  PLAY_HOUSE: "playHouse",
  MONKEY_BARS: "monkeyBars",
  OTHER: "other",
} as const;

export const PLAYGROUND_EQUIPMENT_STATUS = {
  AVAILABLE: "available",
  IN_USE: "inUse",
  MAINTENANCE: "maintenance",
  OUT_OF_ORDER: "outOfOrder",
  REMOVED: "removed",
} as const;

export const PLAYGROUND_MAINTENANCE_TYPE = {
  INSPECTION: "inspection",
  CLEANING: "cleaning",
  REPAIR: "repair",
  REPLACEMENT: "replacement",
  SAFETY_CHECK: "safetyCheck",
  OTHER: "other",
} as const;

export const PLAYGROUND_MAINTENANCE_STATUS = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  POSTPONED: "postponed",
  CANCELLED: "cancelled",
} as const;

// ─── Helper to extract values array for Mongoose enum ───
export function enumValues<T extends Record<string, string>>(
  obj: T
): T[keyof T][] {
  return Object.values(obj) as T[keyof T][];
}
