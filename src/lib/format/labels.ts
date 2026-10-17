import type {
  ExcursionStatus,
  PaymentStanding,
  RoomType,
} from "@/lib/domain/types";

export const STANDING_LABEL: Record<PaymentStanding, string> = {
  overdue: "Atrasado",
  due_today: "Vence hoje",
  pending: "Pendente",
  settled: "Em dia",
};

export const EXCURSION_STATUS_LABEL: Record<ExcursionStatus, string> = {
  draft: "Rascunho",
  open: "Aberta",
  closed: "Fechada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  single: "Individual",
  double: "Casal",
  triple: "Triplo",
  quadruple: "Quádruplo",
  other: "Outro",
};

export function overdueHeadline(count: number): string {
  return count === 1 ? "parcela atrasada" : "parcelas atrasadas";
}

export function dueTodayHeadline(count: number): string {
  return count === 1 ? "vence hoje" : "vencem hoje";
}

export function paidLabel(count: number): string {
  return count === 1 ? "1 paga" : `${count} pagas`;
}

export function overdueLabel(count: number): string {
  return count === 1 ? "1 atrasada" : `${count} atrasadas`;
}
