const CONFIG: Record<string, { label: string; classe: string }> = {
  em_andamento: {
    label: "Em andamento",
    classe: "bg-ink/8 text-ink/70 border-ink/15",
  },
  urgente: {
    label: "Urgente",
    classe: "bg-accent/10 text-accent border-accent/25",
  },
  aguardando: {
    label: "Aguardando",
    classe: "bg-gold/10 text-gold border-gold/30",
  },
  arquivado: {
    label: "Arquivado",
    classe: "bg-ink/5 text-ink/40 border-ink/10",
  },
  vencido: {
    label: "Vencido",
    classe: "bg-[#d94a4214] text-[#d94a42] border-[#d94a4238]",
  },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status] ?? CONFIG.em_andamento;
  return (
    <span
      className={`inline-flex items-center font-sans text-[9px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${cfg.classe}`}
    >
      {cfg.label}
    </span>
  );
}
