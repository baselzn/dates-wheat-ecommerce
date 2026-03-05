import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, MessageCircle, ChevronDown, ChevronUp, Send } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface ProductQAProps {
  productId: number;
}

export default function ProductQA({ productId }: ProductQAProps) {
  const { user } = useAuth();
  const [showAskForm, setShowAskForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: questions, isLoading, refetch } = trpc.ecommerce.qa.list.useQuery({ productId });

  const askMutation = trpc.ecommerce.qa.ask.useMutation({
    onSuccess: () => {
      toast.success("Your question has been submitted! We'll answer it soon.");
      setQuestion("");
      setGuestName("");
      setGuestEmail("");
      setShowAskForm(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit question");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    askMutation.mutate({
      productId,
      question: question.trim(),
      guestName: !user ? guestName.trim() || undefined : undefined,
      guestEmail: !user ? guestEmail.trim() || undefined : undefined,
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const answeredQuestions = questions?.filter((q) => q.answer) ?? [];
  const unansweredCount = questions?.filter((q) => !q.answer).length ?? 0;

  return (
    <Card className="mt-8">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            Questions & Answers
            {questions && questions.length > 0 && (
              <Badge variant="secondary" className="text-xs">{questions.length}</Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setShowAskForm((v) => !v)}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Ask a Question
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Ask Form */}
        {showAskForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-muted/50 rounded-lg space-y-3">
            <h4 className="font-medium text-sm">Submit Your Question</h4>
            {!user && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Your name (optional)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="text-sm"
                />
                <Input
                  type="email"
                  placeholder="Email (optional)"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}
            <Textarea
              placeholder="What would you like to know about this product?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="text-sm resize-none"
              required
              minLength={5}
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{question.length}/1000</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAskForm(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={askMutation.isPending || !question.trim()}
                >
                  <Send className="w-3 h-3" />
                  {askMutation.isPending ? "Submitting..." : "Submit Question"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}

        {/* No questions */}
        {!isLoading && answeredQuestions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No answered questions yet.</p>
            {!showAskForm && (
              <Button
                variant="link"
                size="sm"
                className="mt-1 text-xs"
                onClick={() => setShowAskForm(true)}
              >
                Be the first to ask!
              </Button>
            )}
          </div>
        )}

        {/* Answered Q&A list */}
        {!isLoading && answeredQuestions.length > 0 && (
          <div className="space-y-3">
            {answeredQuestions.map((q) => {
              const isExpanded = expandedIds.has(q.id);
              return (
                <div key={q.id} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(q.id)}
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                      Q
                    </span>
                    <span className="flex-1 text-sm font-medium">{q.question}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                  </button>
                  {isExpanded && q.answer && (
                    <div className="flex items-start gap-3 p-3 bg-primary/5 border-t">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold mt-0.5">
                        A
                      </span>
                      <p className="text-sm text-foreground/90">{q.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pending questions note */}
        {unansweredCount > 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            {unansweredCount} question{unansweredCount > 1 ? "s" : ""} awaiting answer
          </p>
        )}
      </CardContent>
    </Card>
  );
}
