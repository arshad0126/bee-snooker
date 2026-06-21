import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '../ui';
import { Share2 } from 'lucide-react';

interface QrCodeGeneratorProps {
  value: string;
  groupName: string;
  secretCode: string;
}

export const QrCodeGenerator: React.FC<QrCodeGeneratorProps> = ({
  value,
  groupName,
  secretCode,
}) => {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(value);
    alert('Invite link copied to clipboard!');
  };

  return (
    <Card className="border border-emerald-500/10 shadow-sm max-w-sm mx-auto overflow-hidden">
      <div className="bg-emerald-950/10 dark:bg-emerald-950/20 px-4 py-3 text-center border-b border-emerald-500/10">
        <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">Join {groupName}</h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Scan QR to connect spectator devices</p>
      </div>
      <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-4 bg-white dark:bg-white rounded-xl shadow-inner border border-zinc-100">
          <QRCodeSVG value={value} size={180} fgColor="#064e3b" bgColor="#ffffff" level="H" />
        </div>

        <div className="w-full text-center space-y-2">
          <div className="text-xs font-semibold uppercase text-zinc-400">Secret Join Code</div>
          <div className="text-xl font-bold tracking-wider font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-700/5 dark:bg-emerald-700/10 py-1.5 px-3 rounded-lg inline-block border border-emerald-500/10">
            {secretCode}
          </div>
        </div>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-400 font-semibold hover:underline"
        >
          <Share2 size={14} />
          Copy Invite Link
        </button>
      </CardContent>
    </Card>
  );
};
