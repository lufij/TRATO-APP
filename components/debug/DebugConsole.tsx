import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Bug, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  data?: any;
}

export function DebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [originalConsole, setOriginalConsole] = useState<any>({});

  useEffect(() => {
    // Interceptar console.log, warn, error para capturar todos los logs
    const interceptConsole = () => {
      const original = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info
      };
      
      setOriginalConsole(original);

      const addLog = (level: 'log' | 'warn' | 'error' | 'info', args: any[]) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        const logEntry: LogEntry = {
          timestamp: new Date().toLocaleTimeString(),
          level,
          message,
          data: args.length === 1 && typeof args[0] === 'object' ? args[0] : args
        };

        setLogs(prev => [...prev.slice(-49), logEntry]); // Mantener solo últimos 50 logs

        // Llamar método original
        original[level](...args);
      };

      console.log = (...args) => addLog('log', args);
      console.warn = (...args) => addLog('warn', args);
      console.error = (...args) => addLog('error', args);
      console.info = (...args) => addLog('info', args);
    };

    interceptConsole();

    return () => {
      // Restaurar console original al desmontar
      if (originalConsole.log) {
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        console.info = originalConsole.info;
      }
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
    toast.success('Logs limpiados');
  };

  const copyLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(logText).then(() => {
      toast.success('Logs copiados al portapapeles');
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warn': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const errorCount = logs.filter(log => log.level === 'error').length;
  const warningCount = logs.filter(log => log.level === 'warn').length;

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Botón flotante para abrir/cerrar */}
      <Button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-20 left-4 z-50 p-2 h-12 w-12"
        variant={errorCount > 0 ? "destructive" : "outline"}
        size="sm"
      >
        <Bug className="w-4 h-4" />
        {(errorCount > 0 || warningCount > 0) && (
          <Badge className="absolute -top-2 -right-2 min-w-[20px] h-5 text-xs">
            {errorCount + warningCount}
          </Badge>
        )}
      </Button>

      {/* Consola de debug */}
      {isVisible && (
        <Card className="fixed bottom-4 left-16 w-96 h-80 z-50 shadow-lg border-red-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Debug Console
              </CardTitle>
              <div className="flex gap-1">
                <Button onClick={copyLogs} size="sm" variant="ghost" className="p-1 h-6">
                  <Copy className="w-3 h-3" />
                </Button>
                <Button onClick={clearLogs} size="sm" variant="ghost" className="p-1 h-6">
                  <Trash2 className="w-3 h-3" />
                </Button>
                <Button onClick={() => setIsVisible(false)} size="sm" variant="ghost" className="p-1 h-6">
                  ×
                </Button>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline">Total: {logs.length}</Badge>
              {errorCount > 0 && <Badge variant="destructive">Errores: {errorCount}</Badge>}
              {warningCount > 0 && <Badge variant="secondary">Warnings: {warningCount}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`text-xs p-2 rounded border ${getLevelColor(log.level)}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs opacity-75">
                        {log.timestamp}
                      </span>
                      <Badge variant="outline" className="text-xs py-0 px-1">
                        {log.level}
                      </Badge>
                    </div>
                    <div className="mt-1 font-mono text-xs break-all">
                      {log.message}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center text-gray-500 text-xs py-4">
                    No hay logs disponibles
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </>
  );
}
