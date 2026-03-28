"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  BedDouble,
  Users,
  Layers,
  Building2,
  Sparkles,
  Box,
  FileText,
  CreditCard,
  Receipt,
  Wrench,
  Square,
  Search,
  UtensilsCrossed,
  ShoppingCart,
  Archive,
  UserCircle,
  Clock,
  CheckCircle2,
  Gauge,
  Settings,
  Bell,
  Gem,
  GitBranch,
  Globe,
  BarChart3,
  Briefcase,
  PieChart,
  Award,
  Wine,
  ShieldCheck,
  Droplets,
  Package,
  Tags,
  DollarSign,
  Gamepad2,
  Layout,
  ClipboardList,
  LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleSidebarCollapsed } from "@/store/ui-slice";
import {
  ACCOMMODATION_PERMISSIONS,
  ACCOMMODATION_ROLE_PERMISSION_MATRIX,
  RESTAURANT_PERMISSIONS,
  RESTAURANT_ROLE_PERMISSION_MATRIX,
  BAR_PERMISSIONS,
  BAR_ROLE_PERMISSION_MATRIX,
  CONFERENCE_PERMISSIONS,
  CONFERENCE_ROLE_PERMISSION_MATRIX,
  POOL_PERMISSIONS,
  POOL_ROLE_PERMISSION_MATRIX,
  PLAYGROUND_PERMISSIONS,
  PLAYGROUND_ROLE_PERMISSION_MATRIX,
  FINANCE_PERMISSIONS,
  FINANCE_ROLE_PERMISSION_MATRIX,
  MAINTENANCE_DEPT_PERMISSIONS,
  MAINTENANCE_DEPT_ROLE_PERMISSION_MATRIX,
} from "@/constants";

const ACC_ADMIN_ROLES = ["tenantAdmin", "branchManager", "superAdmin", "hotelOwner"];
const REST_ADMIN_ROLES = ["tenantAdmin", "branchManager", "superAdmin", "hotelOwner"];
const BAR_ADMIN_ROLES = ["tenantAdmin", "branchManager", "superAdmin", "hotelOwner"];
const CONF_ADMIN_ROLES = ["tenantAdmin", "branchManager", "superAdmin", "hotelOwner"];
const POOL_ADMIN_ROLES = ["tenantAdmin", "branchManager", "superAdmin", "hotelOwner"];
const PLAYGROUND_ADMIN_ROLES = ["tenantAdmin", "branchManager", "superAdmin", "hotelOwner"];
const FINANCE_ADMIN_ROLES = ["tenantAdmin", "branchManager", "superAdmin", "hotelOwner", "financeManager"];
const MAINTENANCE_DEPT_ADMIN_ROLES = ["tenantAdmin", "branchManager", "superAdmin", "hotelOwner", "maintenanceManager"];

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Accommodation/Restaurant: user must have at least one of these permissions to see the link */
  requiredPermissions?: string[];
  /** Nested links (e.g. Housekeeping hub). */
  children?: NavItem[];
}

interface NavSection {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  roles: string[];
  hiddenOnPathPrefixes?: string[];
  /** Optional count for section badge (e.g. pending items). */
  badge?: number;
}

const STAFF_ROLES = [
  "superAdmin",
  "hotelOwner",
  "tenantAdmin",
  "branchManager",
  "financeManager",
  "maintenanceManager",
  "technician",
  "eventManager",
  "salesOfficer",
  "operationsCoordinator",
  "hrManager",
  "inventoryManager",
  "storekeeper",
  "frontDesk",
  "reservationOfficer",
  "barManager",
  "bartender",
  "barCashier",
  "housekeeper",
  "maintenance",
  "accountant",
  "posStaff",
  "restaurantManager",
  "cashier",
  "waiter",
  "hostess",
  "supervisor",
  "headChef",
  "sousChef",
  "kitchenStaff",
  "procurementOfficer",
  "eventCoordinator",
];

const ALL_ROLES = [...STAFF_ROLES, "customer"];

const ADMIN_ROLES = ["tenantAdmin", "branchManager"];

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    roles: ALL_ROLES,
  },
  {
    title: "Explore",
    icon: Globe,
    items: [
      { href: "/my-bookings", label: "My Bookings", icon: Calendar },
      { href: "/browse-hotels", label: "Browse Hotels", icon: Globe },
    ],
    roles: ["customer"],
  },
  {
    title: "Hotel Branches",
    icon: Building2,
    items: [
      { href: "/branches", label: "Branches", icon: GitBranch },
    ],
    roles: ADMIN_ROLES,
  },
  {
    title: "Restaurant Department",
    icon: UtensilsCrossed,
    items: [
      { href: "/restaurant/employees", label: "Employees", icon: Users, requiredPermissions: [RESTAURANT_PERMISSIONS.EMPLOYEES_MANAGE] },
      { href: "/restaurant/roles", label: "Staff & roles", icon: ShieldCheck, requiredPermissions: [RESTAURANT_PERMISSIONS.ROLES_VIEW] },
      { href: "/inventory-procurement/suppliers?department=restaurant", label: "Suppliers", icon: Briefcase, requiredPermissions: [RESTAURANT_PERMISSIONS.SUPPLIERS_VIEW] },
      { href: "/inventory-procurement/purchase-orders?department=restaurant", label: "Purchase Orders", icon: ShoppingCart, requiredPermissions: [RESTAURANT_PERMISSIONS.PURCHASE_ORDERS_VIEW] },
      { href: "/inventory-procurement/transfers?department=restaurant", label: "Transfers", icon: GitBranch, requiredPermissions: [RESTAURANT_PERMISSIONS.TRANSFERS_VIEW] },
      { href: "/restaurant/movement-flow", label: "Movement Flow", icon: Layers, requiredPermissions: [RESTAURANT_PERMISSIONS.MOVEMENT_FLOW_VIEW] },
      { href: "/restaurant/stock-control", label: "Stock Control (Overview)", icon: CheckCircle2, requiredPermissions: [RESTAURANT_PERMISSIONS.STOCK_CONTROL_VIEW] },
      { href: "/restaurant/stock-control/movement", label: "Record Movement", icon: CheckCircle2, requiredPermissions: [RESTAURANT_PERMISSIONS.STOCK_CONTROL_VIEW] },
      { href: "/restaurant/stock-control/physical-count", label: "Physical Count", icon: CheckCircle2, requiredPermissions: [RESTAURANT_PERMISSIONS.STOCK_CONTROL_VIEW] },
      { href: "/restaurant/stock-control/receive-pos", label: "Receive POs", icon: CheckCircle2, requiredPermissions: [RESTAURANT_PERMISSIONS.STOCK_CONTROL_VIEW] },
      { href: "/restaurant/stock-control/receipts", label: "PO Receipts", icon: CheckCircle2, requiredPermissions: [RESTAURANT_PERMISSIONS.STOCK_CONTROL_VIEW] },
      { href: "/restaurant/stock-control/ledger", label: "Movement Ledger", icon: CheckCircle2, requiredPermissions: [RESTAURANT_PERMISSIONS.STOCK_CONTROL_VIEW] },
      { href: "/pos/inventory?department=restaurant", label: "Inventory", icon: Archive, requiredPermissions: [RESTAURANT_PERMISSIONS.INVENTORY_VIEW] },
      { href: "/restaurant/units", label: "Units & Yields", icon: Tags, requiredPermissions: [RESTAURANT_PERMISSIONS.INVENTORY_VIEW, RESTAURANT_PERMISSIONS.RECIPES_VIEW, RESTAURANT_PERMISSIONS.PRODUCTION_VIEW] },
      { href: "/restaurant/recipes", label: "Recipe Engine", icon: CheckCircle2, requiredPermissions: [RESTAURANT_PERMISSIONS.RECIPES_VIEW] },
      { href: "/restaurant/production", label: "Production Batches", icon: Box, requiredPermissions: [RESTAURANT_PERMISSIONS.PRODUCTION_VIEW] },
      { href: "/pos/menu-items?department=restaurant", label: "Menu Items", icon: UtensilsCrossed, requiredPermissions: [RESTAURANT_PERMISSIONS.MENU_ITEMS_VIEW] },
      { href: "/pos/tables?department=restaurant", label: "Tables", icon: LayoutDashboard, requiredPermissions: [RESTAURANT_PERMISSIONS.TABLES_VIEW] },
      { href: "/pos/orders?department=restaurant", label: "Orders", icon: ShoppingCart, requiredPermissions: [RESTAURANT_PERMISSIONS.ORDERS_VIEW, RESTAURANT_PERMISSIONS.ORDERS_CREATE] },
      { href: "/restaurant/kds", label: "KDS Workflow", icon: Clock, requiredPermissions: [RESTAURANT_PERMISSIONS.KDS_VIEW] },
      { href: "/reports/restaurant", label: "Restaurant Reports", icon: BarChart3, requiredPermissions: [RESTAURANT_PERMISSIONS.REPORTS_VIEW] },
      { href: "/reports/restaurant-consolidated", label: "Consolidated Reports", icon: Building2, requiredPermissions: [RESTAURANT_PERMISSIONS.REPORTS_VIEW] },
      { href: "/payments?department=restaurant", label: "Payments", icon: CreditCard, requiredPermissions: [RESTAURANT_PERMISSIONS.PAYMENTS_VIEW] },
      { href: "/expenses?department=restaurant", label: "Expenses", icon: Receipt, requiredPermissions: [RESTAURANT_PERMISSIONS.EXPENSES_VIEW] },
      {
        href: "/reports/department?department=restaurant",
        label: "Accounting",
        icon: PieChart,
        requiredPermissions: [RESTAURANT_PERMISSIONS.ACCOUNTING_VIEW],
      },
      {
        href: "/reports/income-expense-statement",
        label: "Income & Expense Statement",
        icon: FileText,
        requiredPermissions: [RESTAURANT_PERMISSIONS.ACCOUNTING_VIEW],
      },
    ],
    roles: [
      ...ADMIN_ROLES,
      "restaurantManager",
      "cashier",
      "waiter",
      "hostess",
      "supervisor",
      "headChef",
      "sousChef",
      "kitchenStaff",
      "storekeeper",
      "procurementOfficer",
      "posStaff",
      "accountant",
      "financeManager",
      "hotelOwner",
    ],
  },
  {
    title: "Bar Department",
    icon: Wine,
    items: [
      { href: "/bar", label: "Bar Overview", icon: UtensilsCrossed, requiredPermissions: [BAR_PERMISSIONS.OVERVIEW_VIEW] },
      { href: "/bar/employees", label: "Employees", icon: Users, requiredPermissions: [BAR_PERMISSIONS.EMPLOYEES_MANAGE] },
      { href: "/bar/role-matrix", label: "Staff & roles", icon: ShieldCheck, requiredPermissions: [BAR_PERMISSIONS.ROLES_VIEW] },
      { href: "/bar/menu-items", label: "Menu Items", icon: Wine, requiredPermissions: [BAR_PERMISSIONS.MENU_ITEMS_VIEW] },
      { href: "/bar/recipes", label: "Recipes", icon: CheckCircle2, requiredPermissions: [BAR_PERMISSIONS.RECIPES_VIEW] },
      { href: "/bar/inventory-items", label: "Inventory Items", icon: Square, requiredPermissions: [BAR_PERMISSIONS.INVENTORY_ITEMS_VIEW] },
      { href: "/bar/orders", label: "Orders", icon: ShoppingCart, requiredPermissions: [BAR_PERMISSIONS.ORDER_CREATE, BAR_PERMISSIONS.ORDER_UPDATE] },
      { href: "/bar/inventory", label: "Inventory", icon: Archive, requiredPermissions: [BAR_PERMISSIONS.INVENTORY_VIEW] },
      { href: "/bar/stock-control", label: "Stock Control", icon: CheckCircle2, requiredPermissions: [BAR_PERMISSIONS.STOCK_CONTROL_VIEW, BAR_PERMISSIONS.STOCK_MANAGE] },
      { href: "/bar/shifts", label: "Shifts", icon: Clock, requiredPermissions: [BAR_PERMISSIONS.SHIFTS_VIEW, BAR_PERMISSIONS.SHIFT_OPEN] },
      { href: "/bar/pricing-rules", label: "Happy Hour Rules", icon: Calendar, requiredPermissions: [BAR_PERMISSIONS.PRICING_RULES_VIEW] },
      { href: "/bar/suppliers", label: "Suppliers", icon: Box, requiredPermissions: [BAR_PERMISSIONS.SUPPLIERS_VIEW] },
      { href: "/bar/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, requiredPermissions: [BAR_PERMISSIONS.PURCHASE_ORDERS_VIEW] },
      { href: "/reports/bar", label: "BAR Reports", icon: BarChart3, requiredPermissions: [BAR_PERMISSIONS.REPORT_VIEW] },
      { href: "/bar/payments", label: "Payments", icon: CreditCard, requiredPermissions: [BAR_PERMISSIONS.PAYMENTS_VIEW] },
      { href: "/bar/expenses", label: "Expenses", icon: Receipt, requiredPermissions: [BAR_PERMISSIONS.EXPENSES_VIEW] },
      {
        href: "/bar/accounting",
        label: "Accounting",
        icon: PieChart,
        requiredPermissions: [BAR_PERMISSIONS.ACCOUNTING_VIEW],
      },
      { href: "/bar/finance", label: "Finance", icon: FileText, requiredPermissions: [BAR_PERMISSIONS.FINANCE_VIEW] },
    ],
    roles: [...ADMIN_ROLES, "barManager", "bartender", "barCashier", "accountant"],
  },
  {
    title: "Accommodation",
    icon: BedDouble,
    items: [
      { href: "/accommodation", label: "Accommodation Overview", icon: BedDouble, requiredPermissions: [ACCOMMODATION_PERMISSIONS.ROOMS_VIEW] },
      { href: "/front-desk-board", label: "Front Desk Board", icon: Gauge, requiredPermissions: [ACCOMMODATION_PERMISSIONS.CHECK_IN] },
      { href: "/bookings", label: "Bookings", icon: Calendar, requiredPermissions: [ACCOMMODATION_PERMISSIONS.BOOKING_CREATE, ACCOMMODATION_PERMISSIONS.CHECK_IN] },
      { href: "/bookings/calendar", label: "Booking Calendar", icon: Calendar, requiredPermissions: [ACCOMMODATION_PERMISSIONS.BOOKING_CREATE, ACCOMMODATION_PERMISSIONS.CHECK_IN] },
      { href: "/bookings/transactions", label: "Booking transactions", icon: Receipt, requiredPermissions: [ACCOMMODATION_PERMISSIONS.PAYMENTS_VIEW, ACCOMMODATION_PERMISSIONS.PAYMENTS_PROCESS, ACCOMMODATION_PERMISSIONS.BOOKING_CREATE] },
      { href: "/rooms", label: "Rooms", icon: BedDouble, requiredPermissions: [ACCOMMODATION_PERMISSIONS.ROOMS_VIEW] },
      { href: "/rooms/floors", label: "Floors", icon: Building2, requiredPermissions: [ACCOMMODATION_PERMISSIONS.ROOMS_VIEW] },
      { href: "/guests", label: "Guests", icon: Users, requiredPermissions: [ACCOMMODATION_PERMISSIONS.GUESTS_VIEW] },
      { href: "/room-categories", label: "Room Categories", icon: Layers, requiredPermissions: [ACCOMMODATION_PERMISSIONS.ROOMS_VIEW, ACCOMMODATION_PERMISSIONS.PRICING_VIEW] },
      { href: "/pricing-rules?department=accommodation", label: "Pricing Rules", icon: Tags, requiredPermissions: [ACCOMMODATION_PERMISSIONS.PRICING_VIEW] },
      { href: "/accommodation/policies", label: "Accommodation Policies", icon: ShieldCheck, requiredPermissions: [ACCOMMODATION_PERMISSIONS.ROOMS_VIEW] },
      { href: "/corporate-accounts", label: "Corporate Accounts", icon: Briefcase, requiredPermissions: [ACCOMMODATION_PERMISSIONS.GUESTS_VIEW, ACCOMMODATION_PERMISSIONS.BOOKING_CREATE] },
      {
        href: "/housekeeping",
        label: "Housekeeping",
        icon: Sparkles,
        requiredPermissions: [ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_VIEW],
        children: [
          {
            href: "/housekeeping",
            label: "Overview",
            icon: LayoutDashboard,
            requiredPermissions: [ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_VIEW],
          },
          {
            href: "/housekeeping/tasks",
            label: "Tasks",
            icon: ClipboardList,
            requiredPermissions: [ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_VIEW],
          },
          {
            href: "/housekeeping/board",
            label: "Room board",
            icon: LayoutGrid,
            requiredPermissions: [ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_VIEW],
          },
          {
            href: "/housekeeping/reports",
            label: "Reports",
            icon: BarChart3,
            requiredPermissions: [ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_VIEW],
          },
        ],
      },
      { href: "/maintenance", label: "Maintenance", icon: Wrench, requiredPermissions: [ACCOMMODATION_PERMISSIONS.MAINTENANCE_VIEW] },
      { href: "/assets", label: "Assets", icon: Square, requiredPermissions: [ACCOMMODATION_PERMISSIONS.ROOMS_VIEW, ACCOMMODATION_PERMISSIONS.MAINTENANCE_VIEW] },
      { href: "/lost-and-found", label: "Lost & Found", icon: Search, requiredPermissions: [ACCOMMODATION_PERMISSIONS.LOST_AND_FOUND_MANAGE] },
      { href: "/accommodation/roles", label: "Staff & roles", icon: ShieldCheck, requiredPermissions: [ACCOMMODATION_PERMISSIONS.ROLES_VIEW] },
      { href: "/accommodation/employees", label: "Employees", icon: Users, requiredPermissions: [ACCOMMODATION_PERMISSIONS.EMPLOYEES_MANAGE] },
      { href: "/payments?department=accommodation", label: "Payments", icon: CreditCard, requiredPermissions: [ACCOMMODATION_PERMISSIONS.PAYMENTS_VIEW, ACCOMMODATION_PERMISSIONS.PAYMENTS_PROCESS] },
      { href: "/expenses?department=accommodation", label: "Expenses", icon: Receipt, requiredPermissions: [ACCOMMODATION_PERMISSIONS.PAYMENTS_VIEW, ACCOMMODATION_PERMISSIONS.REPORTS_VIEW] },
      {
        href: "/reports/department?department=accommodation",
        label: "Accounting",
        icon: PieChart,
        requiredPermissions: [ACCOMMODATION_PERMISSIONS.REPORTS_VIEW, ACCOMMODATION_PERMISSIONS.PAYMENTS_VIEW],
      },
      { href: "/reports/accommodation", label: "Accommodation Reports", icon: BarChart3, requiredPermissions: [ACCOMMODATION_PERMISSIONS.REPORTS_VIEW] },
    ],
    roles: [...ADMIN_ROLES, "frontDesk", "reservationOfficer", "housekeeper", "maintenance", "accountant"],
  },
  {
    title: "Events Department",
    icon: Sparkles,
    items: [
      { href: "/conference", label: "Conference Overview", icon: LayoutDashboard, requiredPermissions: [CONFERENCE_PERMISSIONS.OVERVIEW_VIEW] },
      { href: "/conference/employees", label: "Employees", icon: Users, requiredPermissions: [CONFERENCE_PERMISSIONS.EMPLOYEES_MANAGE] },
      { href: "/conference/roles", label: "Staff & roles", icon: ShieldCheck, requiredPermissions: [CONFERENCE_PERMISSIONS.ROLES_VIEW] },
      { href: "/event-halls", label: "Event Halls", icon: Building2, requiredPermissions: [CONFERENCE_PERMISSIONS.EVENT_HALLS_VIEW] },
      { href: "/event-bookings", label: "Event Bookings", icon: Sparkles, requiredPermissions: [CONFERENCE_PERMISSIONS.EVENT_BOOKINGS_VIEW] },
      { href: "/event-bookings/calendar", label: "Event Calendar", icon: Calendar, requiredPermissions: [CONFERENCE_PERMISSIONS.EVENT_CALENDAR_VIEW] },
      { href: "/event-bookings/pipeline", label: "Proposals pipeline", icon: FileText, requiredPermissions: [CONFERENCE_PERMISSIONS.PROPOSALS_VIEW] },
      { href: "/event-resources", label: "Resources", icon: Box, requiredPermissions: [CONFERENCE_PERMISSIONS.RESOURCES_VIEW] },
      { href: "/reports/conference", label: "Financial Reporting", icon: BarChart3, requiredPermissions: [CONFERENCE_PERMISSIONS.REPORTS_VIEW] },
      { href: "/payments?department=conference", label: "Payments", icon: CreditCard, requiredPermissions: [CONFERENCE_PERMISSIONS.PAYMENTS_VIEW] },
      { href: "/expenses?department=conference", label: "Expenses", icon: Receipt, requiredPermissions: [CONFERENCE_PERMISSIONS.EXPENSES_VIEW] },
      { href: "/conference/accounting", label: "Income & Expenses Accounting", icon: PieChart, requiredPermissions: [CONFERENCE_PERMISSIONS.ACCOUNTING_VIEW] },
    ],
    roles: [
      ...ADMIN_ROLES,
      "superAdmin",
      "hotelOwner",
      "eventCoordinator",
      "eventManager",
      "salesOfficer",
      "operationsCoordinator",
      "accountant",
    ],
  },
  {
    title: "Pool Department",
    icon: Droplets,
    items: [
      { href: "/pool", label: "Pool Overview", icon: Droplets, requiredPermissions: [POOL_PERMISSIONS.OVERVIEW_VIEW] },
      { href: "/pool/employees", label: "Employees", icon: Users, requiredPermissions: [POOL_PERMISSIONS.EMPLOYEES_MANAGE] },
      { href: "/pool/roles", label: "Staff & roles", icon: ShieldCheck, requiredPermissions: [POOL_PERMISSIONS.ROLES_VIEW] },
      { href: "/pool/areas", label: "Pool Areas", icon: Building2, requiredPermissions: [POOL_PERMISSIONS.AREAS_VIEW] },
      { href: "/pool/bookings", label: "Bookings", icon: Calendar, requiredPermissions: [POOL_PERMISSIONS.BOOKINGS_VIEW] },
      { href: "/pool/maintenance", label: "Maintenance", icon: Wrench, requiredPermissions: [POOL_PERMISSIONS.MAINTENANCE_VIEW] },
      { href: "/invoices?department=pool", label: "Invoices", icon: FileText, requiredPermissions: [POOL_PERMISSIONS.INVOICES_VIEW] },
      { href: "/payments?department=pool", label: "Income (Payments)", icon: CreditCard, requiredPermissions: [POOL_PERMISSIONS.PAYMENTS_VIEW] },
      { href: "/expenses?department=pool", label: "Expenses", icon: Receipt, requiredPermissions: [POOL_PERMISSIONS.EXPENSES_VIEW] },
      {
        href: "/reports/department?department=pool",
        label: "Accounting",
        icon: PieChart,
        requiredPermissions: [POOL_PERMISSIONS.ACCOUNTING_VIEW],
      },
      { href: "/reports/pool", label: "Pool Reports", icon: BarChart3, requiredPermissions: [POOL_PERMISSIONS.REPORTS_VIEW] },
    ],
    roles: [...ADMIN_ROLES, "accountant", "maintenanceManager", "technician"],
  },
  {
    title: "Playground Department",
    icon: Gamepad2,
    items: [
      { href: "/playground", label: "Playground Overview", icon: Gamepad2, requiredPermissions: [PLAYGROUND_PERMISSIONS.OVERVIEW_VIEW] },
      { href: "/playground/areas", label: "Playground Areas", icon: Building2, requiredPermissions: [PLAYGROUND_PERMISSIONS.AREAS_VIEW] },
      { href: "/playground/bookings", label: "Bookings", icon: Calendar, requiredPermissions: [PLAYGROUND_PERMISSIONS.BOOKINGS_VIEW] },
      { href: "/playground/calendar", label: "Calendar", icon: CalendarCheck, requiredPermissions: [PLAYGROUND_PERMISSIONS.BOOKINGS_VIEW] },
      { href: "/playground/equipment", label: "Equipment", icon: Box, requiredPermissions: [PLAYGROUND_PERMISSIONS.EQUIPMENT_VIEW] },
      { href: "/playground/maintenance", label: "Maintenance", icon: Wrench, requiredPermissions: [PLAYGROUND_PERMISSIONS.MAINTENANCE_VIEW] },
      { href: "/invoices?department=playground", label: "Invoices", icon: FileText, requiredPermissions: [PLAYGROUND_PERMISSIONS.INVOICES_VIEW] },
      { href: "/payments?department=playground", label: "Income (Payments)", icon: CreditCard, requiredPermissions: [PLAYGROUND_PERMISSIONS.PAYMENTS_VIEW] },
      { href: "/expenses?department=playground", label: "Expenses", icon: Receipt, requiredPermissions: [PLAYGROUND_PERMISSIONS.EXPENSES_VIEW] },
      {
        href: "/reports/department?department=playground",
        label: "Department P&L",
        icon: PieChart,
        requiredPermissions: [PLAYGROUND_PERMISSIONS.ACCOUNTING_VIEW],
      },
      { href: "/reports/department?department=playground", label: "Playground Reports", icon: BarChart3, requiredPermissions: [PLAYGROUND_PERMISSIONS.REPORTS_VIEW] },
    ],
    roles: [...ADMIN_ROLES, "accountant", "maintenanceManager", "technician"],
  },
  {
    title: "Finance Department",
    icon: DollarSign,
    items: [
      { href: "/finance/roles", label: "Staff & roles", icon: ShieldCheck, requiredPermissions: [FINANCE_PERMISSIONS.ROLES_VIEW] },
      { href: "/finance/employees", label: "Employees", icon: Users, requiredPermissions: [FINANCE_PERMISSIONS.EMPLOYEES_MANAGE] },
      { href: "/invoices", label: "Invoices", icon: FileText, requiredPermissions: [FINANCE_PERMISSIONS.INVOICES_VIEW] },
      { href: "/reports/corporate", label: "Corporate Reports", icon: Briefcase, requiredPermissions: [FINANCE_PERMISSIONS.CORPORATE_REPORTS_VIEW] },
      { href: "/reports/finance-accounting", label: "Financial Reports", icon: BarChart3, requiredPermissions: [FINANCE_PERMISSIONS.FINANCIAL_REPORTS_VIEW] },
      {
        href: "/reports/income-expense-statement",
        label: "Income & Expense Statement",
        icon: FileText,
        requiredPermissions: [FINANCE_PERMISSIONS.FINANCIAL_REPORTS_VIEW],
      },
      { href: "/staff/salary-payments", label: "Salary payments", icon: DollarSign, requiredPermissions: [FINANCE_PERMISSIONS.EXPENSES_VIEW] },
      { href: "/staff/salary-structures", label: "Salary structures", icon: Layers, requiredPermissions: [FINANCE_PERMISSIONS.EXPENSES_VIEW] },
      { href: "/payments?department=financeAccounting", label: "Payments", icon: CreditCard, requiredPermissions: [FINANCE_PERMISSIONS.PAYMENTS_VIEW] },
      { href: "/expenses?department=financeAccounting", label: "Expenses", icon: Receipt, requiredPermissions: [FINANCE_PERMISSIONS.EXPENSES_VIEW] },
      {
        href: "/reports/department?department=financeAccounting",
        label: "Department P&L",
        icon: PieChart,
        requiredPermissions: [FINANCE_PERMISSIONS.DEPARTMENT_PL_VIEW],
      },
    ],
    roles: [...ADMIN_ROLES, "hotelOwner", "financeManager", "accountant"],
  },
  // {
  //   title: "Maintenance Department",
  //   icon: Wrench,
  //   items: [
  //     { href: "/maintenance/roles", label: "Staff & roles", icon: ShieldCheck, requiredPermissions: [MAINTENANCE_DEPT_PERMISSIONS.ROLES_VIEW] },
  //     { href: "/maintenance/employees", label: "Employees", icon: Users, requiredPermissions: [MAINTENANCE_DEPT_PERMISSIONS.EMPLOYEES_MANAGE] },
  //     { href: "/maintenance", label: "Maintenance Tickets", icon: Wrench, requiredPermissions: [MAINTENANCE_DEPT_PERMISSIONS.TICKETS_VIEW] },
  //     { href: "/assets", label: "Asset Tracking", icon: Square, requiredPermissions: [MAINTENANCE_DEPT_PERMISSIONS.ASSETS_VIEW] },
  //     { href: "/reports/maintenance", label: "Maintenance Reports", icon: BarChart3, requiredPermissions: [MAINTENANCE_DEPT_PERMISSIONS.REPORTS_VIEW] },
  //     { href: "/payments?department=maintenance", label: "Income", icon: CreditCard, requiredPermissions: [MAINTENANCE_DEPT_PERMISSIONS.PAYMENTS_VIEW] },
  //     { href: "/expenses?department=maintenance", label: "Expenses", icon: Receipt, requiredPermissions: [MAINTENANCE_DEPT_PERMISSIONS.EXPENSES_VIEW] },
  //     {
  //       href: "/reports/department?department=maintenance",
  //       label: "Accounting",
  //       icon: PieChart,
  //       requiredPermissions: [MAINTENANCE_DEPT_PERMISSIONS.ACCOUNTING_VIEW],
  //     },
  //   ],
  //   roles: [
  //     ...ADMIN_ROLES,
  //     "hotelOwner",
  //     "financeManager",
  //     "maintenanceManager",
  //     "technician",
  //     "accountant",
  //     "maintenance",
  //   ],
  //   hiddenOnPathPrefixes: ["/bar"],
  // },
  
  {
    title: "Staff Management",
    icon: Users,
    items: [
      { href: "/users", label: "Users", icon: UserCircle },
      { href: "/staff/salary-payments", label: "Salary payments", icon: DollarSign },
      { href: "/staff/salary-structures", label: "Salary structures", icon: Layers },
      { href: "/staff/shifts", label: "Shifts", icon: Clock },
      { href: "/staff/attendance", label: "Attendance", icon: CheckCircle2 },
      { href: "/staff/performance", label: "Performance", icon: Award },
      { href: "/reports/staff", label: "Staff Reports", icon: BarChart3 },
      {
        href: "/reports/department?department=staffManagement",
        label: "Accounting",
        icon: PieChart,
      },
    ],
    roles: [...ADMIN_ROLES, "hrManager"],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      { href: "/settings", label: "Profile", icon: Settings },
      { href: "/settings/website-builder", label: "Website builder", icon: Layout },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/activity-logs", label: "Activity Logs", icon: Clock },
    ],
    roles: STAFF_ROLES,
  },
  {
    title: "Account",
    icon: UserCircle,
    items: [
      { href: "/settings", label: "Profile", icon: Settings },
    ],
    roles: ["customer"],
  },
  {
    title: "Platform",
    icon: Gem,
    items: [
      { href: "/platform/tenants", label: "Tenants", icon: Building2 },
      { href: "/platform/subscription-plans", label: "Subscription Plans", icon: Gem },
    ],
    roles: ["superAdmin"],
  },
];

/** Flatten for active-state matching: only leaf links (parent with children is a label, not a duplicate href). */
function flattenNavItemsForActive(items: NavItem[]): NavItem[] {
  const out: NavItem[] = [];
  for (const item of items) {
    if (item.children?.length) {
      out.push(...item.children);
    } else {
      out.push(item);
    }
  }
  return out;
}

/** Returns the single href that should be active (longest matching) so only one item is active per section. */
function getActiveHref(pathname: string, items: NavItem[]): string | null {
  const path = pathname.replace(/\?.*/, "");
  let best: { href: string; len: number } | null = null;
  for (const item of items) {
    const href = item.href.replace(/\?.*/, "");
    const exact = path === href;
    const prefix = href !== "/dashboard" && (path.startsWith(href + "/") || path === href);
    if (exact || prefix) {
      const len = href.length;
      if (!best || len > best.len) best = { href: item.href, len };
    }
  }
  return best?.href ?? null;
}

function NavLink({
  href,
  label,
  icon: Icon,
  collapsed,
  active,
}: NavItem & { collapsed: boolean; active: boolean }) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        "hover:translate-x-0.5 active:translate-x-0",
        collapsed && "justify-center px-2",
        active
          ? "bg-slate-200/90 text-slate-900 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-700"
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-slate-600"
          aria-hidden
        />
      )}
      <Icon
        className={cn("h-5 w-5 shrink-0 transition-colors", active ? "text-slate-700" : "text-slate-400")}
        aria-hidden
        strokeWidth={active ? 2.25 : 1.75}
      />
      {!collapsed && <span className={cn("truncate", active && "font-semibold")}>{label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { sidebarCollapsed } = useAppSelector((s) => s.ui);
  const { user } = useAppSelector((s) => s.auth);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set(NAV_SECTIONS.map((s) => s.title))
  );
  const [flyoutSection, setFlyoutSection] = useState<string | null>(null);
  const [flyoutRect, setFlyoutRect] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const closeFlyout = () => {
    setFlyoutSection(null);
    setFlyoutRect(null);
  };

  const userRole = (user?.role ?? "").trim();
  const userRoleLower = userRole.toLowerCase();
  const userRoleNormalized = userRoleLower.replace(/\s+/g, ""); // "Front Desk" -> "frontdesk"
  const hasRole = (roles: string[]) =>
    roles.some((r) => r.toLowerCase().replace(/\s+/g, "") === userRoleNormalized);

  // Platform owner (superAdmin) without a tenant: only show Dashboard, Platform, and Settings
  const isPlatformOnly =
    userRoleNormalized === "superadmin" && !user?.tenantId;
  const PLATFORM_ONLY_SECTION_TITLES = ["Overview", "Platform", "Settings"];
  const visibleSections = (s: (typeof NAV_SECTIONS)[0]) =>
    s?.title &&
    hasRole(s.roles) &&
    !s.hiddenOnPathPrefixes?.some((p) => pathname.startsWith(p)) &&
    (!isPlatformOnly || PLATFORM_ONLY_SECTION_TITLES.includes(s.title));

  // Resolve accommodation permissions: admins get all; others from matrix (lookup by canonical key, case-insensitive, ignore spaces)
  const isAccAdmin = ACC_ADMIN_ROLES.some(
    (r) => r.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const accMatrixKey = Object.keys(ACCOMMODATION_ROLE_PERMISSION_MATRIX).find(
    (k) => k.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const accAllowedPermissions: string[] = isAccAdmin
    ? (Object.values(ACCOMMODATION_PERMISSIONS) as string[])
    : (accMatrixKey ? ACCOMMODATION_ROLE_PERMISSION_MATRIX[accMatrixKey] ?? [] : []);

  const getAccommodationFilteredItems = (items: NavItem[]): NavItem[] => {
    const check = (it: NavItem) =>
      !it.requiredPermissions?.length ||
      it.requiredPermissions.some((p) => accAllowedPermissions.includes(p));
    return items
      .map((item) => {
        if (item.children?.length) {
          const children = item.children.filter(check);
          if (!check(item) || children.length === 0) return null;
          return { ...item, children };
        }
        return check(item) ? item : null;
      })
      .filter((x): x is NavItem => x != null);
  };

  const isRestAdmin = REST_ADMIN_ROLES.some(
    (r) => r.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const restMatrixKey = Object.keys(RESTAURANT_ROLE_PERMISSION_MATRIX).find(
    (k) => k.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const restAllowedPermissions: string[] = isRestAdmin
    ? (Object.values(RESTAURANT_PERMISSIONS) as string[])
    : (restMatrixKey ? RESTAURANT_ROLE_PERMISSION_MATRIX[restMatrixKey] ?? [] : []);

  const getRestaurantFilteredItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.requiredPermissions?.length) return true;
      return item.requiredPermissions.some((p) => restAllowedPermissions.includes(p));
    });
  };

  const isBarAdmin = BAR_ADMIN_ROLES.some(
    (r) => r.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const barMatrixKey = Object.keys(BAR_ROLE_PERMISSION_MATRIX).find(
    (k) => k.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const barAllowedPermissions: string[] = isBarAdmin
    ? (Object.values(BAR_PERMISSIONS) as string[])
    : (barMatrixKey ? BAR_ROLE_PERMISSION_MATRIX[barMatrixKey] ?? [] : []);

  const getBarFilteredItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.requiredPermissions?.length) return true;
      return item.requiredPermissions.some((p) => barAllowedPermissions.includes(p));
    });
  };

  const isConfAdmin = CONF_ADMIN_ROLES.some(
    (r) => r.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const confMatrixKey = Object.keys(CONFERENCE_ROLE_PERMISSION_MATRIX).find(
    (k) => k.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const confAllowedPermissions: string[] = isConfAdmin
    ? (Object.values(CONFERENCE_PERMISSIONS) as string[])
    : (confMatrixKey ? CONFERENCE_ROLE_PERMISSION_MATRIX[confMatrixKey] ?? [] : []);

  const getConferenceFilteredItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.requiredPermissions?.length) return true;
      return item.requiredPermissions.some((p) => confAllowedPermissions.includes(p));
    });
  };

  const isPoolAdmin = POOL_ADMIN_ROLES.some(
    (r) => r.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const poolMatrixKey = Object.keys(POOL_ROLE_PERMISSION_MATRIX).find(
    (k) => k.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const poolAllowedPermissions: string[] = isPoolAdmin
    ? (Object.values(POOL_PERMISSIONS) as string[])
    : (poolMatrixKey ? POOL_ROLE_PERMISSION_MATRIX[poolMatrixKey] ?? [] : []);

  const getPoolFilteredItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.requiredPermissions?.length) return true;
      return item.requiredPermissions.some((p) => poolAllowedPermissions.includes(p));
    });
  };

  const isPlaygroundAdmin = PLAYGROUND_ADMIN_ROLES.some(
    (r) => r.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const playgroundMatrixKey = Object.keys(PLAYGROUND_ROLE_PERMISSION_MATRIX).find(
    (k) => k.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const playgroundAllowedPermissions: string[] = isPlaygroundAdmin
    ? (Object.values(PLAYGROUND_PERMISSIONS) as string[])
    : (playgroundMatrixKey ? PLAYGROUND_ROLE_PERMISSION_MATRIX[playgroundMatrixKey] ?? [] : []);
  const getPlaygroundFilteredItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.requiredPermissions?.length) return true;
      return item.requiredPermissions.some((p) => playgroundAllowedPermissions.includes(p));
    });
  };

  const isFinanceAdmin = FINANCE_ADMIN_ROLES.some(
    (r) => r.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const financeMatrixKey = Object.keys(FINANCE_ROLE_PERMISSION_MATRIX).find(
    (k) => k.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const financeAllowedPermissions: string[] = isFinanceAdmin
    ? (Object.values(FINANCE_PERMISSIONS) as string[])
    : (financeMatrixKey ? FINANCE_ROLE_PERMISSION_MATRIX[financeMatrixKey] ?? [] : []);

  const getFinanceFilteredItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.requiredPermissions?.length) return true;
      return item.requiredPermissions.some((p) => financeAllowedPermissions.includes(p));
    });
  };

  const isMaintenanceDeptAdmin = MAINTENANCE_DEPT_ADMIN_ROLES.some(
    (r) => r.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const maintenanceDeptMatrixKey = Object.keys(MAINTENANCE_DEPT_ROLE_PERMISSION_MATRIX).find(
    (k) => k.toLowerCase().replace(/\s+/g, "") === userRoleNormalized
  );
  const maintenanceDeptAllowedPermissions: string[] = isMaintenanceDeptAdmin
    ? (Object.values(MAINTENANCE_DEPT_PERMISSIONS) as string[])
    : (maintenanceDeptMatrixKey ? MAINTENANCE_DEPT_ROLE_PERMISSION_MATRIX[maintenanceDeptMatrixKey] ?? [] : []);

  const getMaintenanceDeptFilteredItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.requiredPermissions?.length) return true;
      return item.requiredPermissions.some((p) => maintenanceDeptAllowedPermissions.includes(p));
    });
  };

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!sidebarCollapsed) {
      setFlyoutSection(null);
      setFlyoutRect(null);
    }
  }, [sidebarCollapsed]);

  return (
    <>
      {/* Logo + Toggle — glass-style header with orange accent */}
      <div className="flex shrink-0 border-b border-slate-100/80 bg-white/60 px-3 py-3 backdrop-blur-sm">
        <div
          className={cn(
            "flex h-14 min-h-14 items-center gap-2",
            sidebarCollapsed ? "justify-center" : "justify-between w-full"
          )}
        >
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => dispatch(toggleSidebarCollapsed())}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25 lg:flex"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition-all duration-200 hover:opacity-90 hover:translate-x-0.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-md shadow-orange-500/20">
                  <span className="text-sm font-bold">B</span>
                </div>
                <span className="truncate text-base font-bold text-slate-900">Bookgh</span>
              </Link>
              <button
                type="button"
                onClick={() => dispatch(toggleSidebarCollapsed())}
                className="hidden shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition-all duration-200 hover:scale-105 hover:bg-slate-100 hover:text-slate-700 lg:flex"
                aria-label="Collapse to icons"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapsed: icon rail with flyout */}
      {sidebarCollapsed && mounted && (
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
          {NAV_SECTIONS.filter((s) => visibleSections(s)).map((section) => {
            const SectionIcon = section.icon;
            const isOpen = flyoutSection === section.title;
            return (
              <div key={section.title} className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    if (isOpen) {
                      closeFlyout();
                    } else {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setFlyoutRect({ top: rect.top, left: rect.right + 4 });
                      setFlyoutSection(section.title);
                    }
                  }}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105",
                    isOpen ? "bg-slate-100 text-slate-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  )}
                  title={section.title}
                  aria-expanded={isOpen}
                >
                  <SectionIcon className="h-5 w-5" aria-hidden />
                  {section.badge != null && section.badge > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff6d00] px-1 text-[10px] font-semibold text-white">
                      {section.badge > 99 ? "99+" : section.badge}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>
      )}

      {/* Flyout rendered in portal so it appears above header/main (high z-index) */}
      {mounted &&
        flyoutSection &&
        flyoutRect &&
        (() => {
          const section = NAV_SECTIONS.find((s) => s.title === flyoutSection);
          if (!section) return null;
          const maxPanelHeight = 28 * 16; // 28rem in px
          const vh = typeof window !== "undefined" ? window.innerHeight : 600;
          const maxH = Math.min(vh - 24, maxPanelHeight);
          const top = Math.min(flyoutRect.top, vh - maxH - 12);
          return createPortal(
            <>
              <div
                className="fixed inset-0 z-9998"
                aria-hidden
                onClick={closeFlyout}
              />
              <div
                className="fixed z-9999 flex min-w-[220px] flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
                style={{
                  top,
                  left: flyoutRect.left,
                  maxHeight: maxH,
                  boxShadow: "0 10px 40px rgba(36, 0, 70, 0.12)",
                }}
              >
                <p className="sticky top-0 z-10 shrink-0 border-b border-slate-100 bg-white px-3 py-2 text-sm font-semibold tracking-wider text-slate-500">
                  {section.title}
                </p>
                <div className="min-h-0 overflow-y-auto py-1">
                  {(() => {
                    const sectionItems =
                      section.title === "Accommodation"
                        ? getAccommodationFilteredItems(section.items)
                        : section.title === "Restaurant Department"
                          ? getRestaurantFilteredItems(section.items)
                          : section.title === "Bar Department"
                            ? getBarFilteredItems(section.items)
                            : section.title === "Events Department"
                              ? getConferenceFilteredItems(section.items)
                              : section.title === "Pool Department"
                                ? getPoolFilteredItems(section.items)
                                : section.title === "Playground Department"
                                  ? getPlaygroundFilteredItems(section.items)
                                  : section.title === "Finance Department"
                                    ? getFinanceFilteredItems(section.items)
                                    : section.title === "Maintenance Department"
                                      ? getMaintenanceDeptFilteredItems(section.items)
                                      : section.items;
                    const flatForActive = flattenNavItemsForActive(sectionItems);
                    const activeHref = getActiveHref(pathname, flatForActive);
                    const flyoutLinks = sectionItems.flatMap((item) =>
                      item.children?.length ? item.children : [item]
                    );
                    return flyoutLinks.map((item) => {
                      const active = item.href === activeHref;
                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          onClick={closeFlyout}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-slate-200/90 text-slate-900 ring-1 ring-slate-200"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                          )}
                        >
                          <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-slate-700" : "text-slate-400")} />
                          {item.label}
                        </Link>
                      );
                    });
                  })()}
                </div>
              </div>
            </>,
            document.body
          );
        })()}

      {/* Expanded: full nav with section headers, depth, badges, animated collapse */}
      {!sidebarCollapsed && (
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {!mounted ? (
            <div className="rounded-xl" aria-hidden>
              <div className="h-8 rounded-t-xl bg-slate-100/80 px-3 py-2" />
              <ul className="space-y-1 pb-2">
                <li className="h-9 rounded-lg bg-slate-50" />
                <li className="h-9 rounded-lg bg-slate-50" />
                <li className="h-9 rounded-lg bg-slate-50" />
              </ul>
            </div>
          ) : (
            NAV_SECTIONS.filter((s) => visibleSections(s)).map((section, index) => {
              const isSectionCollapsed = collapsedSections.has(section.title);
              const SectionIcon = section.icon;
              return (
                <div
                  key={section.title ?? `section-${index}`}
                  className="rounded-xl bg-slate-50/60 shadow-sm"
                  style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="flex w-full items-center justify-between gap-2 rounded-t-xl px-3 py-2.5 text-left text-sm font-semibold tracking-wider text-slate-500 transition-all duration-200 hover:bg-slate-100/80 hover:text-slate-700"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <SectionIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      <span className="truncate">{section.title}</span>
                      {section.badge != null && section.badge > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff6d00] px-1.5 text-[10px] font-bold text-white">
                          {section.badge > 99 ? "99+" : section.badge}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-slate-400 transition-transform duration-200" style={{ transform: isSectionCollapsed ? "rotate(0deg)" : "rotate(180deg)" }}>
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </span>
                  </button>
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isSectionCollapsed ? "0fr" : "1fr" }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <ul className="space-y-0.5 pb-2 pt-0.5">
                        {(() => {
                          const sectionItems =
                            section.title === "Accommodation"
                              ? getAccommodationFilteredItems(section.items)
                              : section.title === "Restaurant Department"
                                ? getRestaurantFilteredItems(section.items)
                                : section.title === "Bar Department"
                                  ? getBarFilteredItems(section.items)
                                  : section.title === "Events Department"
                                    ? getConferenceFilteredItems(section.items)
                                    : section.title === "Pool Department"
                                      ? getPoolFilteredItems(section.items)
                                      : section.title === "Playground Department"
                                        ? getPlaygroundFilteredItems(section.items)
                                        : section.title === "Finance Department"
                                          ? getFinanceFilteredItems(section.items)
                                          : section.title === "Maintenance Department"
                                            ? getMaintenanceDeptFilteredItems(section.items)
                                            : section.items;
                          const flatForActive = flattenNavItemsForActive(sectionItems);
                          const activeHref = getActiveHref(pathname, flatForActive);
                          return sectionItems.map((item) =>
                            item.children?.length ? (
                              <li key={item.href} className="space-y-0.5">
                                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  <span className="truncate">{item.label}</span>
                                </div>
                                <ul className="ml-1 space-y-0.5 border-l border-slate-200/90 pl-2">
                                  {item.children.map((child) => (
                                    <li key={child.href}>
                                      <NavLink
                                        {...child}
                                        collapsed={false}
                                        active={child.href === activeHref}
                                      />
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ) : (
                              <li key={item.href}>
                                <NavLink
                                  {...item}
                                  collapsed={false}
                                  active={item.href === activeHref}
                                />
                              </li>
                            )
                          );
                        })()}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </nav>
      )}
    </>
  );
}
