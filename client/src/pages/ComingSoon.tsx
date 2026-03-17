import { Rocket } from "lucide-react";

export default function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Rocket className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-extrabold tracking-tight mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {description ?? "This feature is currently being built. Check back soon!"}
      </p>
    </div>
  );
}
