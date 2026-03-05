import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  MessageCircle, CheckCircle, Eye, EyeOff, Trash2, Search,
  ChevronDown, ChevronUp, Filter
} from "lucide-react";
import { toast } from "sonner";

type Question = {
  id: number;
  productId: number;
  question: string;
  answer: string | null;
  guestName: string | null;
  guestEmail: string | null;
  isPublished: boolean;
  createdAt: Date | string;
  answeredAt: Date | string | null;
};

function QuestionRow({ q, onRefetch }: { q: Question; onRefetch: () => void }) {
  const [expanded, setExpanded] = useState(!q.answer);
  const [answerText, setAnswerText] = useState(q.answer ?? "");

  const answerMutation = trpc.ecommerce.qa.answer.useMutation({
    onSuccess: () => { toast.success("Answer saved!"); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });
  const togglePublish = trpc.ecommerce.qa.togglePublish.useMutation({
    onSuccess: () => { toast.success(q.isPublished ? "Hidden from customers" : "Published to customers"); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.ecommerce.qa.delete.useMutation({
    onSuccess: () => { toast.success("Question deleted"); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });

  const askerName = q.guestName || "Customer";

  return (
    <div className={`border rounded-lg overflow-hidden ${!q.answer ? "border-amber-300 bg-amber-50/30" : "border-border"}`}>
      {/* Question header */}
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">Q</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs text-muted-foreground font-medium">{askerName}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleDateString()}</span>
            {!q.answer && <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs px-1.5 py-0">Needs Answer</Badge>}
            {q.answer && !q.isPublished && <Badge variant="secondary" className="text-xs px-1.5 py-0">Hidden</Badge>}
            {q.answer && q.isPublished && <Badge className="bg-green-100 text-green-700 border-green-300 text-xs px-1.5 py-0">Published</Badge>}
          </div>
          <p className="text-sm font-medium line-clamp-2">{q.question}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded answer section */}
      {expanded && (
        <div className="px-4 pb-4 border-t bg-muted/20">
          {/* Existing answer */}
          {q.answer && (
            <div className="flex items-start gap-3 py-3 mb-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">A</span>
              <p className="text-sm text-foreground/90">{q.answer}</p>
            </div>
          )}

          {/* Answer form */}
          <div className="space-y-2">
            <Textarea
              placeholder={q.answer ? "Edit the answer..." : "Write your answer..."}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                disabled={answerMutation.isPending || !answerText.trim()}
                onClick={() => answerMutation.mutate({ id: q.id, answer: answerText.trim(), isPublished: true })}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {q.answer ? "Update & Publish" : "Answer & Publish"}
              </Button>
              {q.answer && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  disabled={answerMutation.isPending || !answerText.trim()}
                  onClick={() => answerMutation.mutate({ id: q.id, answer: answerText.trim(), isPublished: false })}
                >
                  Save as Draft
                </Button>
              )}
              {q.answer && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs"
                  disabled={togglePublish.isPending}
                  onClick={() => togglePublish.mutate({ id: q.id, isPublished: !q.isPublished })}
                >
                  {q.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {q.isPublished ? "Hide" : "Show"}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("Delete this question?")) deleteMutation.mutate({ id: q.id });
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminQAManagement() {
  const [filterUnanswered, setFilterUnanswered] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: questions, isLoading, refetch } = trpc.ecommerce.qa.listAdmin.useQuery({
    unansweredOnly: filterUnanswered,
  });

  const filtered = questions?.filter((q) => {
    if (!searchQuery.trim()) return true;
    const q2 = searchQuery.toLowerCase();
    return (
      q.question.toLowerCase().includes(q2) ||
      (q.answer?.toLowerCase().includes(q2)) ||
      (q.guestName?.toLowerCase().includes(q2))
    );
  }) ?? [];

  const unansweredCount = questions?.filter((q) => !q.answer).length ?? 0;

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-primary" />
              Product Q&A
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Answer customer questions to build trust and improve conversions.
            </p>
          </div>
          {unansweredCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-sm px-3 py-1">
              {unansweredCount} unanswered
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <Button
            variant={filterUnanswered ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setFilterUnanswered((v) => !v)}
          >
            <Filter className="w-3.5 h-3.5" />
            {filterUnanswered ? "Showing Unanswered" : "All Questions"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold">{questions?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Total Questions</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-600">{unansweredCount}</div>
            <div className="text-xs text-muted-foreground">Needs Answer</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {questions?.filter((q) => q.isPublished).length ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Published</div>
          </div>
        </div>

        {/* Questions list */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {filterUnanswered ? "No unanswered questions!" : "No questions yet"}
            </p>
            <p className="text-sm mt-1">
              {filterUnanswered
                ? "All questions have been answered."
                : "Questions from product pages will appear here."}
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {/* Sort: unanswered first */}
            {[...filtered]
              .sort((a, b) => {
                if (!a.answer && b.answer) return -1;
                if (a.answer && !b.answer) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              })
              .map((q) => (
                <QuestionRow key={q.id} q={q} onRefetch={refetch} />
              ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
