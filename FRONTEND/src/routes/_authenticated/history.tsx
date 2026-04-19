import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Search, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AqiBadge } from "@/components/AqiBadge";
import {
  exportHistoryCsv,
  getHistory,
  type AqiCategory,
  type HistoryItem,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History — AQI Prediction System" }] }),
  component: HistoryPage,
});

const PAGE_SIZE = 10;

function HistoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AqiCategory | "all">("all");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getHistory({
      page,
      pageSize: PAGE_SIZE,
      search,
      category,
      from: from?.toISOString(),
      to: to?.toISOString(),
    }).then((res) => {
      setItems(res.items);
      setTotal(res.total);
      setLoading(false);
    });
  }, [page, search, category, from, to]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  const handleExport = async () => {
    const blob = await exportHistoryCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aqi-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prediction History</h1>
          <p className="text-sm text-muted-foreground">
            Browse, filter, and export past predictions.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-1.5">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search pollutant or ID…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 pl-8"
              />
            </div>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v as AqiCategory | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Moderate">Moderate</SelectItem>
                <SelectItem value="Unhealthy for Sensitive Groups">Sensitive</SelectItem>
                <SelectItem value="Unhealthy">Unhealthy</SelectItem>
                <SelectItem value="Very Unhealthy">Very Unhealthy</SelectItem>
                <SelectItem value="Hazardous">Hazardous</SelectItem>
              </SelectContent>
            </Select>

            <DatePopover label="From" date={from} onChange={setFrom} />
            <DatePopover label="To" date={to} onChange={setTo} />

            {(from || to || category !== "all" || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setFrom(undefined);
                  setTo(undefined);
                  setPage(1);
                }}
              >
                Reset
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="px-4">Date</TableHead>
                  <TableHead>AQI</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Pollutant</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right pr-4">ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No predictions match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it) => (
                    <TableRow key={it.id} className="cursor-pointer">
                      <TableCell className="px-4 font-medium">
                        {format(new Date(it.date), "MMM d, yyyy · HH:mm")}
                      </TableCell>
                      <TableCell className="font-semibold">{it.aqi}</TableCell>
                      <TableCell>
                        <AqiBadge category={it.category} size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {it.pollutant}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                          {it.source}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4 text-right font-mono text-xs text-muted-foreground">
                        {it.id}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {total === 0
                ? "No results"
                : `Showing ${start}–${end} of ${total} predictions`}
            </p>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DatePopover({
  label,
  date,
  onChange,
}: {
  label: string;
  date: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-start gap-1.5 font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {date ? format(date, "MMM d, yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages: (number | "…")[] = [];
  const max = totalPages;
  if (max <= 7) {
    for (let i = 1; i <= max; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(max - 1, page + 1); i++)
      pages.push(i);
    if (page < max - 2) pages.push("…");
    pages.push(max);
  }
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Prev
      </Button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-2 text-xs text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
