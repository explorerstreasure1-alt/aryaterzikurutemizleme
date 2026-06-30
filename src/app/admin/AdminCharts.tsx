"use client";

import React from "react";
import {
  TrendingUp,
  Award,
  CalendarDays,
  BarChart3,
  Gift,
} from "lucide-react";

interface SimpleChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  maxBarWidth?: number;
}

/** Horizontal bar chart */
function HorizontalBarChart({
  data,
  color = "#0d9488",
  height = 200,
  maxBarWidth = 300,
}: SimpleChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barHeight = 28;
  const gap = 8;
  const totalHeight = data.length * (barHeight + gap);

  return (
    <svg
      width="100%"
      height={Math.max(totalHeight, 40)}
      viewBox={`0 0 ${maxBarWidth + 120} ${Math.max(totalHeight, 40)}`}
      className="overflow-visible"
    >
      {data.map((d, i) => {
        const barW = maxBarWidth * (d.value / maxValue);
        const y = i * (barHeight + gap);
        return (
          <g key={i}>
            <text
              x={0}
              y={y + barHeight - 6}
              fontSize="10"
              fill="#64748b"
              fontWeight="600"
            >
              {d.label.length > 18 ? d.label.slice(0, 17) + "…" : d.label}
            </text>
            <rect
              x={100}
              y={y}
              width={Math.max(barW, 4)}
              height={barHeight}
              rx={6}
              fill={color}
              opacity={0.85}
              className="transition-all"
            />
            <text
              x={100 + barW + 6}
              y={y + barHeight - 6}
              fontSize="10"
              fill="#334155"
              fontWeight="800"
            >
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Vertical bar chart for daily trend */
function DailyBarChart({
  data,
  color = "#0d9488",
  height = 140,
}: SimpleChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barCount = data.length;
  const barWidth = Math.max(16, Math.min(48, 600 / barCount));
  const gap = 4;
  const chartW = barCount * (barWidth + gap);
  const labelH = 18;

  return (
    <svg
      width="100%"
      height={height + labelH}
      viewBox={`0 0 ${Math.max(chartW, 200)} ${height + labelH}`}
      className="overflow-visible"
    >
      {data.map((d, i) => {
        const barH = (d.value / maxValue) * (height - 10);
        const x = i * (barWidth + gap);
        const y = height - barH - 5;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barH, 2)}
              rx={3}
              fill={color}
              opacity={d.value > 0 ? 0.85 : 0.2}
              className="transition-all"
            />
            <text
              x={x + barWidth / 2}
              y={height + labelH - 4}
              fontSize="7"
              fill="#94a3b8"
              fontWeight="600"
              textAnchor="middle"
            >
              {d.label}
            </text>
            {d.value > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 4}
                fontSize="8"
                fill="#334155"
                fontWeight="700"
                textAnchor="middle"
              >
                {d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface AdminChartsProps {
  participations: { createdAt: Date | string }[];
  spinners: { prizeWon: string; createdAt: Date | string }[];
  campaigns: { id: number; name: string }[];
}

export default function AdminCharts({
  participations,
  spinners,
  campaigns,
}: AdminChartsProps) {
  // --- 1. Daily participation trend (last 7 days) ---
  const dailyData: { label: string; value: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const count = participations.filter((p) => {
      const d = new Date(p.createdAt);
      return d >= dayStart && d < dayEnd;
    }).length;

    const label = i === 0 ? "Bugün" : dayStart.toLocaleDateString("tr-TR", { weekday: "short" });
    dailyData.push({ label, value: count });
  }

  // --- 2. Daily spin (wheel) trend ---
  const dailySpinData: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const count = spinners.filter((s) => {
      const d = new Date(s.createdAt);
      return d >= dayStart && d < dayEnd;
    }).length;

    const label = i === 0 ? "Bugün" : dayStart.toLocaleDateString("tr-TR", { weekday: "short" });
    dailySpinData.push({ label, value: count });
  }

  // --- 3. Top prizes won ---
  const prizeCounts: Record<string, number> = {};
  spinners.forEach((s) => {
    prizeCounts[s.prizeWon] = (prizeCounts[s.prizeWon] || 0) + 1;
  });
  const topPrizes = Object.entries(prizeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  // --- 4. Participation by campaign ---
  const campaignParticipation: Record<number, number> = {};
  participations.forEach((p: any) => {
    const cId = p.campaignId;
    campaignParticipation[cId] = (campaignParticipation[cId] || 0) + 1;
  });
  const campaignData = Object.entries(campaignParticipation)
    .map(([id, count]) => {
      const camp = campaigns.find((c) => c.id === parseInt(id));
      return {
        label: camp?.name || `Kampanya #${id}`,
        value: count,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // --- 5. Total stats summary ---
  const totalParticipations = participations.length;
  const totalSpins = spinners.length;
  const totalPrizesWon = spinners.length;

  const noData =
    totalParticipations === 0 && totalSpins === 0;

  if (noData) {
    return (
      <div className="bg-white rounded-3xl border border-teal-50 shadow-sm p-8 text-center">
        <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-400">
          Henüz yeterli veri yok. Kampanya yayınladıkça grafikler burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-teal-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-teal-700">{totalParticipations}</p>
          <p className="text-[9px] font-bold text-teal-500 uppercase tracking-wider">Toplam Katılım</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-emerald-700">{totalSpins}</p>
          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Çark Çevrilme</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-amber-700">{totalPrizesWon}</p>
          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Ödül Kazanıldı</p>
        </div>
        <div className="bg-violet-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-violet-700">{campaigns.length}</p>
          <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wider">Kampanya</p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Participation Trend */}
        <div className="bg-white rounded-2xl border border-teal-50 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-teal-600" />
            <h5 className="text-xs font-black text-teal-700 uppercase tracking-wider">
              Günlük Katılım (7 Gün)
            </h5>
          </div>
          <DailyBarChart data={dailyData} color="#0d9488" height={100} />
        </div>

        {/* Daily Spin Trend */}
        <div className="bg-white rounded-2xl border border-teal-50 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h5 className="text-xs font-black text-emerald-700 uppercase tracking-wider">
              Günlük Çark Çevirme (7 Gün)
            </h5>
          </div>
          <DailyBarChart data={dailySpinData} color="#059669" height={100} />
        </div>

        {/* Top Prizes */}
        {topPrizes.length > 0 && (
          <div className="bg-white rounded-2xl border border-teal-50 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-amber-600" />
              <h5 className="text-xs font-black text-amber-700 uppercase tracking-wider">
                En Çok Kazanılan Ödüller
              </h5>
            </div>
            <HorizontalBarChart data={topPrizes} color="#d97706" height={200} maxBarWidth={240} />
          </div>
        )}

        {/* Campaign Participation */}
        {campaignData.length > 0 && (
          <div className="bg-white rounded-2xl border border-teal-50 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-violet-600" />
              <h5 className="text-xs font-black text-violet-700 uppercase tracking-wider">
                Kampanya Katılımları
              </h5>
            </div>
            <HorizontalBarChart data={campaignData} color="#7c3aed" height={200} maxBarWidth={240} />
          </div>
        )}
      </div>
    </div>
  );
}
