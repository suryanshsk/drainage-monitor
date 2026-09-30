import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, ShieldAlert, MapPin, UserCog, Building2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { IncidentTimeline } from "@/components/tracking/IncidentTimeline";
import { useIncidentDetail } from "@/hooks/useDrainageData";

const escalationChainFor = (category: string, priority: string) => {
  const base = [
    { step: 1, role: "Noida Field Response Team", ministry: "Noida Authority Sewerage & Drainage Department", channel: "SMS + in-app" },
    { step: 2, role: "Noida Jal Nigam Operations", ministry: "Noida Jal Nigam / Noida Water & Sewerage Department", channel: "Dashboard + dispatch" },
    { step: 3, role: "Uttar Pradesh Water Authority", ministry: "Uttar Pradesh Jal Nigam", channel: "Email + escalation alert" },
    { step: 4, role: "State emergency oversight", ministry: "UPSDMA / Department of Urban Development, Uttar Pradesh", channel: "State emergency dashboard" },
    { step: 5, role: "National oversight", ministry: "Ministry of Jal Shakti, Government of India", channel: "Executive dashboard + briefing" },
    { step: 6, role: "NMCG compliance review", ministry: "National Mission for Clean Ganga / Central Water Commission", channel: "National monitoring + final review" },
  ];

  if (priority === "CRITICAL" || category.includes("FLOOD") || category.includes("METHANE") || category.includes("H2S")) {
    return base;
  }
  if (priority === "HIGH") {
    return base.slice(0, 5);
  }
  return base.slice(0, 3);
};

export default function IncidentDetailPage() {
  const { incidentId } = useParams();
  const { incident, loading } = useIncidentDetail(incidentId);
  const [documents, setDocuments] = useState(incident?.official_documents ?? []);
  const [governmentStatus, setGovernmentStatus] = useState(incident?.government_verification?.official_resolution_status ?? "PENDING");
  const [formData, setFormData] = useState({
    documentType: "CLOSURE_MEMO",
    title: "Official closure memo",
    submittedBy: "Government Officer",
    submittedByRole: "STATE_OPERATOR",
    fileName: "closure_memo.pdf",
    notes: "Official government verification submitted after field resolution.",
    status: "APPROVED",
  });

  useEffect(() => {
    if (!incident) return;
    setDocuments(incident.official_documents ?? []);
    setGovernmentStatus(incident.government_verification?.official_resolution_status ?? "PENDING");
  }, [incident]);

  const handleDocumentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const newDocument = {
      id: Date.now(),
      document_type: formData.documentType as any,
      title: formData.title,
      submitted_by: formData.submittedBy,
      submitted_by_role: formData.submittedByRole,
      submitted_at: new Date().toISOString(),
      status: formData.status as any,
      file_name: formData.fileName || "official_document.pdf",
      notes: formData.notes,
    };

    const nextDocuments = [newDocument, ...documents];
    setDocuments(nextDocuments);

    const nextStatus = formData.status === "APPROVED"
      ? "OFFICIALLY_RESOLVED"
      : formData.status === "VERIFIED"
        ? "PRE_SOLVED"
        : "PENDING";
    setGovernmentStatus(nextStatus);

    setFormData((current) => ({
      ...current,
      title: "Official closure memo",
      fileName: "closure_memo.pdf",
      notes: "Official government verification submitted after field resolution.",
    }));
  };

  if (loading) {
    return (
      <AppShell title="Incident detail" subtitle="Loading response data">
        <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] p-8 text-sm text-[var(--color-text-2)]">
          Loading incident details…
        </div>
      </AppShell>
    );
  }

  if (!incident) {
    return (
      <AppShell title="Incident detail" subtitle="Not found">
        <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] p-8 text-sm text-[var(--color-text-2)]">
          Incident not found.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={incident.incident_number}
      subtitle={incident.title}
      headerActions={
        <Link to="/tracking" className="inline-flex items-center gap-2 rounded-md border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-text-1)] hover:bg-[var(--color-bg-3)]">
          <ArrowLeft className="h-4 w-4" />
          Back to tracking
        </Link>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-2)] p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] bg-[var(--color-cyan-dim)] text-[var(--color-cyan)]">
                {incident.category}
              </span>
              <span className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] bg-[var(--color-warn-dim)] text-[var(--color-warn)]">
                {incident.priority}
              </span>
              <span className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] bg-[var(--color-ok-dim)] text-[var(--color-ok)]">
                {incident.status}
              </span>
            </div>

            <p className="text-sm leading-6 text-[var(--color-text-1)]">{incident.description ?? "No incident description provided."}</p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-1)] p-3">
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-2)]"><MapPin className="h-3.5 w-3.5" /> Sector</p>
                <p className="mt-2 text-sm text-[var(--color-text-0)]">{incident.sector ?? "-"}</p>
              </div>
              <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-1)] p-3">
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-2)]"><Clock3 className="h-3.5 w-3.5" /> Detected</p>
                <p className="mt-2 text-sm text-[var(--color-text-0)]">{new Date(incident.detected_at).toLocaleString()}</p>
              </div>
              <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-1)] p-3">
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-2)]"><UserCog className="h-3.5 w-3.5" /> Assignment</p>
                <p className="mt-2 text-sm text-[var(--color-text-0)]">{incident.assigned_user_id ? `User ${incident.assigned_user_id}` : "Unassigned"}</p>
              </div>
            </div>
          </div>

          <IncidentTimeline events={incident.events ?? []} />
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-2)] p-4">
            <div className="mb-4 flex items-center gap-2 text-[var(--color-text-0)]">
              <ShieldAlert className="h-4 w-4 text-[var(--color-warn)]" />
              <p className="text-sm font-medium">Response status</p>
            </div>
            <div className="space-y-3 text-sm text-[var(--color-text-1)]">
              <div className="flex items-center justify-between"><span>Assigned team</span><strong>{incident.assigned_team_name ?? `Team ${incident.assigned_team_id ?? "Pending"}`}</strong></div>
              <div className="flex items-center justify-between"><span>Department</span><strong>{incident.department_name ?? "Pending assignment"}</strong></div>
              <div className="flex items-center justify-between"><span>Ministry / authority</span><strong>{incident.ministry_name ?? "Not assigned"}</strong></div>
              <div className="flex items-center justify-between"><span>Escalation</span><strong>{incident.priority}</strong></div>
              <div className="flex items-center justify-between"><span>Resolution</span><strong>{incident.status === "PRE_SOLVED" ? "Pre-solved" : incident.resolved_at ? "Closed" : "Open"}</strong></div>
              <div className="flex items-center justify-between"><span>Resolution method</span><strong>{incident.resolution_method ?? "Pending"}</strong></div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-2)] p-4">
            <div className="mb-3 flex items-center gap-2 text-[var(--color-text-0)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--color-ok)]" />
              <p className="text-sm font-medium">How it will be resolved</p>
            </div>
            <p className="text-sm leading-6 text-[var(--color-text-1)]">
              {incident.resolution_summary ?? "No resolution summary has been recorded yet."}
            </p>
            {incident.next_step && (
              <div className="mt-3 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-1)] p-3 text-sm text-[var(--color-text-1)]">
                <span className="font-medium text-[var(--color-text-0)]">Next step:</span> {incident.next_step}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-2)] p-4">
            <div className="mb-3 flex items-center gap-2 text-[var(--color-text-0)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--color-ok)]" />
              <p className="text-sm font-medium">Official government verification</p>
            </div>
            {incident.government_verification ? (
              <div className="space-y-3 text-sm text-[var(--color-text-1)]">
                <div className="flex items-center justify-between"><span>Reviewed by</span><strong>{incident.government_verification.reviewed_by}</strong></div>
                <div className="flex items-center justify-between"><span>Department</span><strong>{incident.government_verification.department}</strong></div>
                <div className="flex items-center justify-between"><span>Status</span><strong>{governmentStatus}</strong></div>
                <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-1)] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-2)]">Verification notes</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-1)]">{incident.government_verification.verification_notes}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-1)]">No official verification record submitted yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-2)] p-4">
            <div className="mb-3 flex items-center gap-2 text-[var(--color-text-0)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--color-ok)]" />
              <p className="text-sm font-medium">Official docs submitted</p>
            </div>
            {documents.length > 0 ? (
              <ul className="space-y-3 text-sm text-[var(--color-text-1)]">
                {documents.map((doc) => (
                  <li key={doc.id} className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-1)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[var(--color-text-0)]">{doc.title}</span>
                      <span className="rounded-full bg-[var(--color-ok-dim)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--color-ok)]">{doc.status}</span>
                    </div>
                    <p className="mt-2">Type: {doc.document_type}</p>
                    <p>Submitted by: {doc.submitted_by} ({doc.submitted_by_role})</p>
                    {doc.file_name && <p>File: {doc.file_name}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--color-text-1)]">No government documents submitted yet.</p>
            )}

            <form onSubmit={handleDocumentSubmit} className="mt-4 space-y-3 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-1)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-2)]">Submit government verification</p>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={formData.title}
                  onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                  className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] px-3 py-2 text-sm text-[var(--color-text-0)] outline-none"
                  placeholder="Document title"
                />
                <input
                  value={formData.submittedBy}
                  onChange={(event) => setFormData((current) => ({ ...current, submittedBy: event.target.value }))}
                  className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] px-3 py-2 text-sm text-[var(--color-text-0)] outline-none"
                  placeholder="Government officer name"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={formData.documentType}
                  onChange={(event) => setFormData((current) => ({ ...current, documentType: event.target.value }))}
                  className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] px-3 py-2 text-sm text-[var(--color-text-0)] outline-none"
                >
                  <option value="CLOSURE_MEMO">Closure memo</option>
                  <option value="GOVT_APPROVAL">Government approval</option>
                  <option value="FLOW_RESTORE_CHECK">Flow restoration check</option>
                  <option value="FIELD_REPORT">Field report</option>
                </select>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
                  className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] px-3 py-2 text-sm text-[var(--color-text-0)] outline-none"
                >
                  <option value="VERIFIED">Verified</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                </select>
                <input
                  value={formData.fileName}
                  onChange={(event) => setFormData((current) => ({ ...current, fileName: event.target.value }))}
                  className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] px-3 py-2 text-sm text-[var(--color-text-0)] outline-none"
                  placeholder="file.pdf"
                />
              </div>
              <textarea
                value={formData.notes}
                onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] px-3 py-2 text-sm text-[var(--color-text-0)] outline-none"
                placeholder="Official remarks and verification notes"
              />
              <button type="submit" className="rounded-md bg-[var(--color-cyan)] px-3 py-2 text-sm font-medium text-[#05273a] hover:opacity-90">
                Submit official document
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-2)] p-4">
            <div className="mb-3 flex items-center gap-2 text-[var(--color-text-0)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--color-ok)]" />
              <p className="text-sm font-medium">Evidence & notifications</p>
            </div>
            <ul className="space-y-2 text-sm text-[var(--color-text-1)]">
              <li>Evidence files: {incident.evidence?.length ?? 0}</li>
              <li>Notifications: {incident.notifications?.length ?? 0}</li>
              <li>Assignments: {incident.assignments?.length ?? 0}</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-2)] p-4">
            <div className="mb-3 flex items-center gap-2 text-[var(--color-text-0)]">
              <Building2 className="h-4 w-4 text-[var(--color-cyan)]" />
              <p className="text-sm font-medium">Escalation chain</p>
            </div>
            <div className="space-y-3">
              {escalationChainFor(incident.category, incident.priority).map((step) => (
                <div key={step.step} className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-1)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-2)]">Step {step.step}</p>
                    <span className="text-[10px] text-[var(--color-text-2)]">{step.channel}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--color-text-0)]">{step.role}</p>
                  <p className="mt-1 text-sm text-[var(--color-text-1)]">{step.ministry}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
