import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthModal() {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button size="lg" className="dark">Get Started</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Sign In</DialogTitle>
            <DialogDescription>
              Enter your email and password to access your account.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="John Doe" />
            </Field>
            <Field>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="********" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Cancel</Button>
            </DialogClose>
            <Button type="submit" className="dark">Sign In</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
