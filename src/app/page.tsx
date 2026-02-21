import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">D</span>
            </div>
            <span className="text-xl font-bold">DentOS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Modern Dental Clinic
            <br />
            <span className="text-primary">Management Platform</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Streamline your dental practice with appointments, patient records,
            treatment plans, billing, and inventory — all in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8">Start Free Trial</Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">14-day free trial · No credit card required</p>
        </section>

        <section className="border-t bg-muted/40 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Everything your clinic needs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { title: "Patient CRM", desc: "Complete patient profiles with medical history, dental charting, and document management." },
                { title: "Appointments", desc: "Calendar views, automated reminders, and status tracking for every visit." },
                { title: "Treatment Plans", desc: "Create, approve, and track treatment plans with procedures, costs, and timelines." },
                { title: "Billing & Invoicing", desc: "Generate invoices, record payments, handle partial payments and refunds." },
                { title: "Inventory", desc: "Track stock levels, manage suppliers, and get low-stock alerts." },
                { title: "Reports", desc: "Revenue reports, appointment utilization, and CSV exports." },
              ].map((f) => (
                <div key={f.title} className="rounded-lg border bg-background p-6 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} DentOS. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
