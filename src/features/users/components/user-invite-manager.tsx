"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailPlus, RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createInviteAction, revokeInviteAction } from "@/features/users/actions/invite-actions";
import { formatDateTime } from "@/lib/utils";
import { inviteSchema, type InviteInput } from "@/lib/validations/users";
import type { Profile, UserInvite } from "@/types/database";

type Props = {
  profiles: Profile[];
  invites: UserInvite[];
};

export function UserInviteManager({ profiles, invites }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "lawyer"
    }
  });

  function onSubmit(values: InviteInput) {
    startTransition(async () => {
      const result = await createInviteAction(values);

      if (result.ok) {
        toast.success(result.message);
        form.reset({ email: "", role: "lawyer" });
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Novo convite</CardTitle>
          <CardDescription>Dispara um convite real pelo Supabase Auth e registra o controle interno do convite no office.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="advogado@abrahaoadv.com.br" {...form.register("email")} />
              {form.formState.errors.email ? <p className="text-sm text-destructive">{form.formState.errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={form.watch("role")} onValueChange={(value) => form.setValue("role", value as InviteInput["role"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lawyer">Advogado</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
              Registrar convite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios ativos</CardTitle>
          <CardDescription>Perfis vinculados a AA_profiles no office atual.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.full_name ?? "Sem nome"}</TableCell>
                  <TableCell>
                    <Badge variant={profile.role === "admin" ? "success" : "secondary"}>{profile.role}</Badge>
                  </TableCell>
                  <TableCell>{profile.is_active ? "Ativo" : "Inativo"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(profile.created_at)}</TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Nenhum perfil encontrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Convites</CardTitle>
          <CardDescription>Controle minimo de convites pendentes, aceitos ou revogados.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-32 text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.email}</TableCell>
                  <TableCell>{invite.role}</TableCell>
                  <TableCell>
                    <Badge variant={invite.status === "pending" ? "default" : invite.status === "accepted" ? "success" : "secondary"}>
                      {invite.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(invite.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {invite.status === "pending" ? <RevokeInviteButton invite={invite} /> : null}
                  </TableCell>
                </TableRow>
              ))}
              {invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum convite registrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RevokeInviteButton({ invite }: { invite: UserInvite }) {
  const [isPending, startTransition] = useTransition();

  function revoke() {
    startTransition(async () => {
      const result = await revokeInviteAction(invite.id);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RotateCcw className="h-4 w-4" />
          Revogar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revogar convite?</AlertDialogTitle>
          <AlertDialogDescription>
            O convite de {invite.email} sera marcado como revogado e a acao ficara registrada em auditoria.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={revoke} disabled={isPending}>
            {isPending ? "Revogando..." : "Revogar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
