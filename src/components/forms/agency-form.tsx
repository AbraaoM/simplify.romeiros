"use client";

import { saveAgencyAction } from "@/app/acoes";
import { FormError, SubmitButton, TextField, useFormAction } from "./fields";

export function AgencyForm({
  agency,
}: {
  agency: { name: string; phone: string; city: string; pixKey: string } | null;
}) {
  const [state, action, pending] = useFormAction(saveAgencyAction);
  return (
    <form action={action} className="mt-8 max-w-md space-y-5">
      <TextField label="Nome" name="name" defaultValue={agency?.name ?? ""} required />
      <TextField label="Telefone" name="phone" type="tel" defaultValue={agency?.phone ?? ""} />
      <TextField label="Cidade" name="city" defaultValue={agency?.city ?? ""} />
      <TextField
        label="Chave Pix da agência"
        name="pixKey"
        defaultValue={agency?.pixKey ?? ""}
      />
      <p className="text-sm text-muted dark:text-faint">
        O valor das parcelas vai direto para essa conta. O Caravaneiro não
        intermedeia o pagamento. Use CPF, CNPJ, e-mail, telefone ou chave
        aleatória.
      </p>
      <FormError message={state.message} />
      <SubmitButton pending={pending}>
        {agency ? "Salvar" : "Cadastrar agência"}
      </SubmitButton>
    </form>
  );
}
