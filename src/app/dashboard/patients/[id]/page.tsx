import { getPatient } from "@/server/actions/patients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MedicalHistoryEditor } from "@/components/dashboard/medical-history-editor";
import { AllergyManager } from "@/components/dashboard/allergy-manager";
import { DentalChartEditor } from "@/components/dashboard/dental-chart-editor";
import { DocumentManager } from "@/components/dashboard/document-manager";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let patient;
  try {
    patient = await getPatient(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-muted-foreground">
            {patient.phone ?? ""} {patient.email ? `· ${patient.email}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/appointments?patientId=${patient.id}`}>
            <Button variant="outline">Appointments</Button>
          </Link>
          <Link href={`/dashboard/patients/${patient.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patient Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gender</span>
              <span className="capitalize">{patient.gender ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DOB</span>
              <span>
                {patient.dateOfBirth
                  ? new Date(patient.dateOfBirth).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blood Group</span>
              <span>{patient.bloodGroup ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">City</span>
              <span>{patient.city ?? "—"}</span>
            </div>
            {patient.notes && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground">Notes:</span>
                <p className="mt-1">{patient.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medical History – Interactive */}
        <MedicalHistoryEditor
          patientId={patient.id}
          data={patient.medicalHistory}
        />

        {/* Allergies – Interactive */}
        <AllergyManager
          patientId={patient.id}
          allergies={patient.allergies}
        />
      </div>

      {/* Dental Chart – Interactive */}
      <DentalChartEditor
        patientId={patient.id}
        conditions={patient.toothConditions}
        toothNotes={patient.toothNotes}
      />

      {/* Documents & Attachments */}
      <DocumentManager
        patientId={patient.id}
        documents={patient.documents}
      />

      {/* Recent Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {patient.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments</p>
          ) : (
            <div className="space-y-2">
              {patient.appointments.map((apt) => (
                <Link
                  key={apt.id}
                  href={`/dashboard/appointments/${apt.id}`}
                  className="flex justify-between items-center py-2 border-b last:border-0 text-sm hover:bg-muted/50 rounded px-2 -mx-2 transition-colors"
                >
                  <div>
                    <span className="font-medium">
                      {new Date(apt.startTime).toLocaleDateString()} at{" "}
                      {new Date(apt.startTime).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {apt.type && (
                      <span className="text-muted-foreground ml-2">· {apt.type}</span>
                    )}
                  </div>
                  <Badge variant={apt.status === "COMPLETED" ? "success" : "secondary"}>
                    {apt.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
