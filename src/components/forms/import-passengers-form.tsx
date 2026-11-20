"use client";

import { useActionState } from "react";
import {
  importPassengersAction,
  previewPassengerCsvAction,
} from "@/app/acoes";
import { idleImportState } from "@/app/import-state";
import { FormError, SubmitButton } from "./fields";

const fileControl =
  "mt-1 w-full min-h-11 border border-line bg-paper px-3 py-2 text-base text-ink dark:border-line-dark dark:bg-ink dark:text-paper";

export function ImportPassengersForm({ excursionId }: { excursionId: string }) {
  const [preview, previewAction, previewPending] = useActionState(
    previewPassengerCsvAction,
    idleImportState,
  );
  const [imported, importAction, importPending] = useActionState(
    importPassengersAction,
    idleImportState,
  );
  const rows = preview.rows ?? [];
  const canImport = rows.length > 0 && preview.errorCount === 0;

  return (
    <div className="mt-8 space-y-6">
      <form action={previewAction} className="max-w-md space-y-5">
        <input type="hidden" name="excursionId" value={excursionId} />
        <label className="block">
          <span className="text-sm text-muted dark:text-faint">Arquivo CSV</span>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv,text/plain"
            required
            className={fileControl}
          />
        </label>
        <p className="text-sm text-muted dark:text-faint">
          Colunas: nome, cpf (opcional), telefone, ponto de embarque,
          observações. Até 500 linhas e 512 KB. O ponto de embarque precisa
          já existir nesta excursão.
        </p>
        <FormError message={preview.message} />
        <SubmitButton pending={previewPending} pendingLabel="Lendo o arquivo.">
          Pré-visualizar
        </SubmitButton>
      </form>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted dark:border-line-dark dark:text-faint">
                <th className="py-2 pr-3 font-normal">Linha</th>
                <th className="py-2 pr-3 font-normal">Nome</th>
                <th className="py-2 pr-3 font-normal">CPF</th>
                <th className="py-2 pr-3 font-normal">Telefone</th>
                <th className="py-2 pr-3 font-normal">Embarque</th>
                <th className="py-2 font-normal">Situação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.line} className="border-b border-line dark:border-line-dark">
                  <td className="py-3 pr-3">{row.line}</td>
                  <td className="py-3 pr-3">{row.fullName || "—"}</td>
                  <td className="py-3 pr-3">{row.cpf || "—"}</td>
                  <td className="py-3 pr-3">{row.phone || "—"}</td>
                  <td className="py-3 pr-3">{row.boardingPointName || "—"}</td>
                  <td className="py-3">
                    {row.errors.length === 0 ? (
                      "Ok"
                    ) : (
                      <span className="text-danger dark:text-danger-soft">
                        {row.errors.join(" ")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {canImport ? (
        <form action={importAction} className="max-w-md space-y-4">
          <input type="hidden" name="excursionId" value={excursionId} />
          <label className="block">
            <span className="text-sm text-muted dark:text-faint">
              Envie o mesmo arquivo para confirmar a importação
            </span>
            <input
              type="file"
              name="file"
              accept=".csv,text/csv,text/plain"
              required
              className={fileControl}
            />
          </label>
          <FormError message={imported.message} />
          <SubmitButton pending={importPending} pendingLabel="Importando.">
            {`Importar ${rows.length} passageiro${rows.length === 1 ? "" : "s"}`}
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
