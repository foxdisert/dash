import { NBInput, NBLabel } from "@/components/ui";

/** Customer contact inputs (name / email / phone). Uncontrolled. */
export function CustomerFields({
  defaults,
}: {
  defaults?: { name?: string; email?: string; phone?: string };
}) {
  return (
    <div className="space-y-3">
      <div>
        <NBLabel>Customer name</NBLabel>
        <NBInput
          name="customerName"
          placeholder="e.g. John Doe"
          defaultValue={defaults?.name ?? ""}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <NBLabel>Email</NBLabel>
          <NBInput
            name="customerEmail"
            type="email"
            placeholder="name@email.com"
            defaultValue={defaults?.email ?? ""}
          />
        </div>
        <div>
          <NBLabel>Phone</NBLabel>
          <NBInput
            name="customerPhone"
            type="tel"
            placeholder="+1 555 123 4567"
            defaultValue={defaults?.phone ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
