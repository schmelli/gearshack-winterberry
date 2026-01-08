'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useGardenerChat } from '@/hooks/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Send,
  Trash2,
  RefreshCw,
  Bot,
  User,
  Loader2,
  Activity,
  Database,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
} from 'lucide-react';
import type { GardenerChatMessage, GardenerHealthStatus } from '@/types/gardener';

/**
 * Status badge component for displaying system health
 */
function StatusBadge({ status }: { status: GardenerHealthStatus }) {
  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    degraded: {
      icon: AlertTriangle,
      variant: 'secondary' as const,
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    },
    unhealthy: {
      icon: XCircle,
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {status}
    </Badge>
  );
}

/**
 * Individual chat message component
 */
function ChatMessage({ message, isStreaming }: { message: GardenerChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`flex max-w-[80%] flex-col gap-1 rounded-lg px-4 py-2 ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        <div className="whitespace-pre-wrap text-sm">
          {message.content}
          {isStreaming && !message.content && (
            <span className="inline-flex items-center">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {isStreaming && message.content && (
            <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
          )}
        </div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.toolCalls.map((tool, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                <Wrench className="mr-1 h-3 w-3" />
                {tool.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * System metrics display card
 */
function MetricsCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

/**
 * Main Gardener Chat Client component
 */
export function GardenerChatClient() {
  const t = useTranslations('Admin.gardener');
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isStreaming,
    isLoading,
    error,
    suggestions,
    systemStatus,
    sendMessage,
    clearHistory,
    refreshStatus,
    selectSuggestion,
  } = useGardenerChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isStreaming) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    selectSuggestion(suggestion);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      {/* Header with Status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          {systemStatus && <StatusBadge status={systemStatus.status} />}
          <Button variant="outline" size="icon" onClick={refreshStatus} title={t('refreshStatus')}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* System Metrics Row */}
      {systemStatus && (
        <div className="flex flex-wrap gap-2">
          <MetricsCard label={t('metrics.nodes')} value={systemStatus.metrics.totalNodes.toLocaleString()} icon={Database} />
          <MetricsCard
            label={t('metrics.relationships')}
            value={systemStatus.metrics.totalRelationships.toLocaleString()}
            icon={Activity}
          />
          <MetricsCard label={t('metrics.orphans')} value={systemStatus.metrics.orphanCount} icon={AlertTriangle} />
          <MetricsCard label={t('metrics.duplicates')} value={systemStatus.metrics.duplicatesDetected} icon={AlertTriangle} />
          <MetricsCard label={t('metrics.pendingApprovals')} value={systemStatus.pendingApprovals} icon={CheckCircle2} />
        </div>
      )}

      {/* Chat Area */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-5 w-5" />
              {t('chatTitle')}
            </CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={messages.length === 0 || isStreaming || isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  {t('clearHistory')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('clearConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('clearConfirmDescription')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isLoading}>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={clearHistory} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          {/* Messages - h-0 + flex-1 forces scroll calculation in flex context */}
          <ScrollArea className="h-0 flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <Bot className="mb-4 h-12 w-12 opacity-50" />
                <p className="text-lg font-medium">{t('emptyStateTitle')}</p>
                <p className="text-sm">{t('emptyStateDescription')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={idx}
                    message={msg}
                    isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Error Display */}
          {error && (
            <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && !isStreaming && (
            <div className="border-t px-4 py-2">
              <p className="mb-2 text-xs text-muted-foreground">{t('suggestedQuestions')}</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="h-auto whitespace-normal py-1 text-left text-xs"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2 p-4">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('inputPlaceholder')}
              disabled={isStreaming}
              className="flex-1"
            />
            <Button type="submit" disabled={!inputValue.trim() || isStreaming}>
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
