import Link from "next/link";
import { getGuests } from "../../../src/data/db.ts";
import { formatPHP } from "../../../src/lib/pricing.ts";
import { PermGuard } from "../_perm-guard.tsx";

export const dynamic = "force-dynamic";

export default async function GuestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const search = (sp.q || "").toLowerCase();
  const sort = sp.sort || "recent";
  const tagFilter = sp.tag || "";

  let guests = await getGuests();

  if (search) {
    guests = guests.filter(
      (g) =>
        g.name.toLowerCase().includes(search) ||
        (g.email && g.email.toLowerCase().includes(search)) ||
        (g.phone && g.phone.includes(search)),
    );
  }

  if (tagFilter) {
    guests = guests.filter((g) => g.tags.includes(tagFilter));
  }

  if (sort === "revenue") {
    guests.sort((a, b) => b.totalRevenue - a.totalRevenue);
  } else if (sort === "bookings") {
    guests.sort((a, b) => b.totalBookings - a.totalBookings);
  } else if (sort === "name") {
    guests.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    guests.sort((a, b) => (b.lastCheckIn ?? "").localeCompare(a.lastCheckIn ?? ""));
  }

  const allGuests = await getGuests();
  const totalGuests = allGuests.length;
  const repeatGuests = allGuests.filter((g) => g.totalBookings > 1).length;
  const vipGuests = allGuests.filter((g) => g.tags.includes("VIP")).length;
  const totalRevenue = allGuests.reduce((s, g) => s + g.totalRevenue, 0);

  const allTags = new Set<string>();
  for (const g of allGuests) {
    for (const t of g.tags) allTags.add(t);
  }
  const sortedTags = [...allTags].sort();

  return (
    <PermGuard perm="guests.view">
    <>
      <div className="page-head">
        <h1 className="today">Guest CRM</h1>
      </div>

      <div className="crm-stats">
        <div className="crm-stat-card">
          <span className="crm-stat-value">{totalGuests}</span>
          <span className="crm-stat-label">Total Guests</span>
        </div>
        <div className="crm-stat-card">
          <span className="crm-stat-value">{repeatGuests}</span>
          <span className="crm-stat-label">Repeat Guests</span>
        </div>
        <div className="crm-stat-card">
          <span className="crm-stat-value">{vipGuests}</span>
          <span className="crm-stat-label">VIP Guests</span>
        </div>
        <div className="crm-stat-card">
          <span className="crm-stat-value">{formatPHP(totalRevenue)}</span>
          <span className="crm-stat-label">Lifetime Revenue</span>
        </div>
      </div>

      <div className="panel">
        <form className="filter-bar" method="get">
          <div className="field">
            <label htmlFor="q">Search</label>
            <input
              type="text"
              id="q"
              name="q"
              placeholder="Name, email, or phone..."
              defaultValue={search}
            />
          </div>
          <div className="field">
            <label htmlFor="tag">Tag</label>
            <select id="tag" name="tag" defaultValue={tagFilter}>
              <option value="">All tags</option>
              {sortedTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sort">Sort by</label>
            <select id="sort" name="sort" defaultValue={sort}>
              <option value="recent">Most Recent Stay</option>
              <option value="revenue">Highest Revenue</option>
              <option value="bookings">Most Bookings</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
          <button className="btn" type="submit">
            Filter
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>
          {guests.length} guest{guests.length !== 1 ? "s" : ""}{" "}
          <span className="hint">
            {search || tagFilter ? "matching your filters" : "in your database"}
          </span>
        </h2>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Contact</th>
                <th>Tags</th>
                <th className="tar">Bookings</th>
                <th className="tar">Revenue</th>
                <th>Last Stay</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id}>
                  <td>
                    <Link
                      href={`/admin/guests/${g.id}`}
                      style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
                    >
                      {g.name}
                    </Link>
                    {g.totalBookings > 1 && (
                      <span className="crm-badge repeat">Repeat</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: "0.82rem" }}>
                      {g.email && <div>{g.email}</div>}
                      {g.phone && (
                        <div style={{ color: "var(--text-3)" }}>{g.phone}</div>
                      )}
                      {!g.email && !g.phone && (
                        <span style={{ color: "var(--text-3)" }}>—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="crm-tags-list compact">
                      {g.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`crm-tag sm ${tag === "VIP" ? "vip" : tag === "Blacklisted" ? "blacklisted" : ""}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="tar mono">{g.totalBookings}</td>
                  <td className="tar mono">
                    {g.totalRevenue > 0 ? formatPHP(g.totalRevenue) : "—"}
                  </td>
                  <td className="mono">{g.lastCheckIn ?? "—"}</td>
                  <td>
                    <Link
                      href={`/admin/guests/${g.id}`}
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--accent)",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
    </PermGuard>
  );
}
