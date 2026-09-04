export type Role =
  | "super_admin"
  | "owner"
  | "manager"
  | "reception"
  | "cleaner"
  | "maintenance"
  | "accounting";

export interface Permission {
  key: string;
  label: string;
  group: string;
}

export const ALL_PERMISSIONS: Permission[] = [
  { key: "dashboard.view", label: "View dashboard", group: "Dashboard" },
  { key: "bookings.view", label: "View bookings", group: "Bookings" },
  { key: "bookings.create", label: "Create bookings", group: "Bookings" },
  { key: "bookings.edit", label: "Edit bookings", group: "Bookings" },
  { key: "bookings.cancel", label: "Cancel bookings", group: "Bookings" },
  { key: "calendar.view", label: "View calendar", group: "Calendar" },
  { key: "units.view", label: "View units", group: "Units" },
  { key: "units.edit", label: "Edit unit details", group: "Units" },
  { key: "units.photos", label: "Manage unit photos", group: "Units" },
  { key: "guests.view", label: "View guest info", group: "Guests" },
  { key: "guests.edit", label: "Edit guest info", group: "Guests" },
  { key: "tasks.view", label: "View tasks", group: "Tasks" },
  { key: "tasks.manage", label: "Manage tasks", group: "Tasks" },
  { key: "reports.view", label: "View reports", group: "Reports" },
  { key: "reports.export", label: "Export reports", group: "Reports" },
  { key: "expenses.view", label: "View expenses", group: "Expenses" },
  { key: "expenses.create", label: "Create expenses", group: "Expenses" },
  { key: "expenses.approve", label: "Approve expenses", group: "Expenses" },
  { key: "payments.view", label: "View payments", group: "Payments" },
  { key: "payments.manage", label: "Manage payments", group: "Payments" },
  { key: "payments.collect", label: "Collect payments", group: "Payments" },
  { key: "cleaning.view", label: "View cleaning checklists", group: "Cleaning" },
  { key: "cleaning.perform", label: "Perform cleaning & sign off", group: "Cleaning" },
  { key: "cleaning.edit", label: "Edit checklist templates", group: "Cleaning" },
  { key: "staff.view", label: "View staff", group: "Staff" },
  { key: "staff.manage", label: "Manage staff", group: "Staff" },
  { key: "settings.view", label: "View settings", group: "Settings" },
  { key: "settings.edit", label: "Edit settings", group: "Settings" },
  { key: "audit.view", label: "View audit logs", group: "Audit" },
];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  manager: "Manager",
  reception: "Caretaker / Ops",
  cleaner: "Cleaner",
  maintenance: "Maintenance",
  accounting: "Accounting",
};

export const ROLE_DEFAULTS: Record<Role, string[]> = {
  super_admin: ALL_PERMISSIONS.map((p) => p.key),
  owner: ALL_PERMISSIONS.map((p) => p.key),
  manager: [
    "dashboard.view",
    "bookings.view",
    "bookings.create",
    "bookings.edit",
    "bookings.cancel",
    "calendar.view",
    "units.view",
    "units.edit",
    "units.photos",
    "guests.view",
    "guests.edit",
    "tasks.view",
    "tasks.manage",
    "reports.view",
    "reports.export",
    "expenses.view",
    "expenses.create",
    "expenses.approve",
    "payments.view",
    "payments.manage",
    "settings.view",
    "audit.view",
  ],
  reception: [
    "dashboard.view",
    "bookings.view",
    "bookings.create",
    "bookings.edit",
    "bookings.cancel",
    "calendar.view",
    "units.view",
    "guests.view",
    "guests.edit",
    "tasks.view",
    "tasks.manage",
    "payments.view",
    "payments.collect",
    "cleaning.view",
    "cleaning.perform",
    "cleaning.edit",
  ],
  cleaner: [
    "dashboard.view",
    "tasks.view",
    "tasks.manage",
    "units.view",
    "cleaning.view",
    "cleaning.perform",
  ],
  maintenance: ["dashboard.view", "tasks.view", "tasks.manage", "units.view"],
  accounting: [
    "dashboard.view",
    "bookings.view",
    "reports.view",
    "reports.export",
    "expenses.view",
    "expenses.create",
    "expenses.approve",
    "payments.view",
    "payments.manage",
    "audit.view",
  ],
};

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  active: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: "create" | "update" | "delete" | "login" | "export";
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
}
