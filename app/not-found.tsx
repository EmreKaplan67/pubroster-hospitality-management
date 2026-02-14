import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center gap-6 px-6 text-center bg-background">
      <h1
        className="font-extrabold text-muted-foreground leading-none"
        style={{ fontSize: "10rem" }}
      >
        404
      </h1>
      <h2 className="text-xl font-semibold text-foreground">
        Page not found
      </h2>
      <p className="text-muted-foreground max-w-sm">
        Sorry, we couldn&apos;t find the page you&apos;re looking for.
      </p>
      <Button asChild size="lg">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
