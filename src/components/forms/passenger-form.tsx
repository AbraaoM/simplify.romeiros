"use client";

import { createPassengerAction, updatePassengerAction } from "@/app/acoes";
import type { DocumentType } from "@/lib/domain/types";
import { FormError, SelectField, SubmitButton, TextField, useFormAction } from "./fields";

const DOCUMENTS: Array<{ value: DocumentType; label: string }> = [
  { value: "cpf", label: "CPF" },
  { value: "rg", label: "RG" },
  { value: "passport", label: "Passaporte" },
  { value: "other", label: "Outro" },
];

export function NewPassengerForm({
  excursionId,
  points,
}: {
  excursionId: string;
  points: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useFormAction(createPassengerAction);
  return (
    <form action={action} className="mt-8 max-w-md space-y-5">
      <input type="hidden" name="excursionId" value={excursionId} />
      <TextField label="Nome" name="fullName" required />
      <TextField label="Telefone" name="phone" type="tel" />
      <SelectField label="Documento" name="documentType" defaultValue="cpf" options={DOCUMENTS} />
      <TextField label="Número" name="documentNumber" />
      <TextField label="Emissor" name="documentIssuer" />
      <BoardingSelect points={points} defaultValue="" />
      <TextField label="Valor da primeira parcela" name="amount" />
      <TextField label="Vencimento" name="dueDate" type="date" />
      <FormError message={state.message} />
      <SubmitButton pending={pending}>Incluir passageiro</SubmitButton>
    </form>
  );
}

export function PassengerEditForm({
  excursionId,
  passenger,
  points,
}: {
  excursionId: string;
  passenger: {
    id: string;
    fullName: string;
    phone: string;
    documentType: DocumentType;
    documentNumber: string;
    documentIssuer: string;
    boardingPointId: string;
  };
  points: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useFormAction(updatePassengerAction);
  return (
    <form action={action} className="mt-8 max-w-md space-y-5">
      <input type="hidden" name="excursionId" value={excursionId} />
      <input type="hidden" name="passengerId" value={passenger.id} />
      <TextField label="Nome" name="fullName" defaultValue={passenger.fullName} required />
      <TextField label="Telefone" name="phone" type="tel" defaultValue={passenger.phone} />
      <SelectField
        label="Documento"
        name="documentType"
        defaultValue={passenger.documentType}
        options={DOCUMENTS}
      />
      <TextField label="Número" name="documentNumber" defaultValue={passenger.documentNumber} />
      <TextField label="Emissor" name="documentIssuer" defaultValue={passenger.documentIssuer} />
      <BoardingSelect points={points} defaultValue={passenger.boardingPointId} />
      <FormError message={state.message} />
      <SubmitButton pending={pending} tone="plain">
        Salvar passageiro
      </SubmitButton>
    </form>
  );
}

function BoardingSelect({
  points,
  defaultValue,
}: {
  points: Array<{ id: string; name: string }>;
  defaultValue: string;
}) {
  return (
    <SelectField
      label="Embarque"
      name="boardingPointId"
      defaultValue={defaultValue}
      options={[
        { value: "", label: "Sem ponto" },
        ...points.map((point) => ({ value: point.id, label: point.name })),
      ]}
    />
  );
}
