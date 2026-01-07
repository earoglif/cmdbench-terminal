import React from 'react';
import { HiDotsVertical } from 'react-icons/hi';
import { IoAdd, IoRemove, IoClose } from 'react-icons/io5';
import { VscChromeMaximize, VscChromeRestore } from 'react-icons/vsc';

export const MenuIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <HiDotsVertical className={className} />
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <IoAdd className={className} />
);

export const MinimizeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <IoRemove className={className} />
);

export const MaximizeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <VscChromeMaximize className={className} />
);

export const RestoreIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <VscChromeRestore className={className} />
);

export const CloseIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <IoClose className={className} />
);
