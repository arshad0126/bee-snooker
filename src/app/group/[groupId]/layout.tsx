'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useMatchStore, Group } from '@/lib/store';
import { Button, Dialog } from '@/components/ui';
import { QrCodeGenerator } from '@/components/shared/QrCodeGenerator';
import { Trophy, Calendar, Users, Share2, LogOut, ChevronDown, Award, PlayCircle } from 'lucide-react';
import Link from 'next/link';

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const groupId = params.groupId as string;

  const { activeGroup, initializeDevice, isController, claimController } = useMatchStore();
  
  // Local UI States
  const [shareOpen, setShareOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentGroups, setRecentGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (groupId) {
      initializeDevice(groupId);
    }
  }, [groupId]);

  useEffect(() => {
    const stored = localStorage.getItem('bee_snooker_recent_groups');
    if (stored) {
      try {
        setRecentGroups(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const handleSwitchGroup = (group: Group) => {
    setDropdownOpen(false);
    router.push(`/group/${group.id}`);
  };

  const handleLeave = () => {
    localStorage.removeItem('bee_snooker_active_group');
    router.push('/');
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?join=${activeGroup?.secret_code}` : '';

  const navItems = [
    { name: 'Leaderboard', path: `/group/${groupId}`, icon: Trophy },
    { name: 'Memory Vault', path: `/group/${groupId}/session`, icon: Calendar },
    { name: 'Rivalries', path: `/group/${groupId}/rivalries`, icon: Users },
  ];

  const isScoringPage = pathname.includes('/session/') && !pathname.endsWith('/summary');

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      {/* Header Navigation */}
      <header className={`sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-4 sm:px-6 shrink-0 transition-all ${
        isScoringPage ? 'hidden lg:flex h-12' : 'h-16'
      }`}>
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          {/* Logo / Group Switcher */}
          <div className="relative flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 font-bold text-emerald-500 hover:text-emerald-400">
              <span className="text-lg tracking-wider uppercase font-sans">BEE</span>
            </Link>
            
            <div className="h-4 w-px bg-zinc-800" />

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 text-sm font-semibold text-zinc-200 hover:text-white bg-zinc-900/50 hover:bg-zinc-900 py-1.5 px-3 rounded-lg border border-zinc-800"
              >
                <span>{activeGroup ? activeGroup.name : 'Loading Club...'}</span>
                <ChevronDown size={14} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-md z-50">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1.5">Switch Club</div>
                  {recentGroups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => handleSwitchGroup(g)}
                      className={`w-full text-left p-2 rounded-lg text-sm transition-all hover:bg-zinc-850 ${
                        g.id === groupId ? 'text-emerald-500 font-bold bg-zinc-850/35' : 'text-zinc-300'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                  <div className="border-t border-zinc-800/80 my-1" />
                  <button
                    onClick={handleLeave}
                    className="w-full text-left p-2 rounded-lg text-sm text-rose-500 hover:bg-rose-500/10 flex items-center gap-1.5 font-semibold"
                  >
                    <LogOut size={14} />
                    Leave to main menu
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                    isActive
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Icon size={14} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isController && (
              <Button
                variant="outline"
                size="sm"
                onClick={claimController}
                className="hidden sm:inline-flex border-amber-600/35 text-amber-500 hover:bg-amber-600/10 text-xs py-1"
              >
                Claim Controller
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 text-xs border border-zinc-800 hover:bg-zinc-900 bg-zinc-900/50"
            >
              <Share2 size={13} />
              Share Code
            </Button>
          </div>
        </div>
      </header>

      {/* Sub Header for Mobile Navigation */}
      <nav className={`md:hidden sticky top-16 z-30 bg-zinc-950 border-b border-zinc-900 p-1 flex justify-around shrink-0 transition-all ${
        isScoringPage ? 'hidden' : ''
      }`}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-2 px-4 rounded-xl grow text-center transition-all ${
                isActive
                  ? 'text-emerald-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={16} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Main Page Area */}
      <div className="grow overflow-y-auto">
        <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all ${
          isScoringPage ? 'py-2 px-2 landscape-tight-padding' : ''
        }`}>
          {children}
        </main>
      </div>

      {/* Invite QR Code Modal */}
      {activeGroup && (
        <Dialog isOpen={shareOpen} onClose={() => setShareOpen(false)} title="Group Sharing Panel">
          <QrCodeGenerator
            value={shareUrl}
            groupName={activeGroup.name}
            secretCode={activeGroup.secret_code}
          />
        </Dialog>
      )}
    </div>
  );
}
