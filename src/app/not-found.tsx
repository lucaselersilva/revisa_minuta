import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 premium-grid">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Pagina nao encontrada</CardTitle>
          <CardDescription>O endereco solicitado nao corresponde a uma area disponivel da plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app">Voltar ao dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
