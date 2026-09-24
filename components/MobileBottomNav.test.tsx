import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileBottomNav, MobileBottomNavProps } from './MobileBottomNav';

vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: React.forwardRef((props: any, ref: any) => {
        const { animate, initial, exit, transition, ...rest } = props;
        return <div ref={ref} {...rest} />;
      }),
      button: React.forwardRef((props: any, ref: any) => {
        const { animate, initial, exit, transition, ...rest } = props;
        return <button ref={ref} {...rest} />;
      }),
      span: React.forwardRef((props: any, ref: any) => {
        const { animate, initial, exit, transition, ...rest } = props;
        return <span ref={ref} {...rest} />;
      }),
    },
  };
});

describe('MobileBottomNav (Native iOS/Android PWA Tab Bar)', () => {
  const defaultProps: MobileBottomNavProps = {
    activeStep: 'measure',
    onSelectStep: vi.fn(),
    onOpenQuickExpense: vi.fn(),
    onOpenReportModal: vi.fn(),
    onOpenAIModal: vi.fn(),
    onToggleWakeLock: vi.fn(),
    isWakeLockActive: false,
    onOpenBackupModal: vi.fn(),
    onOpenProjectSwitcher: vi.fn(),
    onToggleTheme: vi.fn(),
    theme: 'dark',
    onOpenScanner: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  it('renders the 5 main bottom navigation slots', () => {
    render(<MobileBottomNav {...defaultProps} />);

    expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();
    expect(screen.getByTestId('tab-measure')).toBeInTheDocument();
    expect(screen.getByTestId('tab-design')).toBeInTheDocument();
    expect(screen.getByTestId('tab-fab')).toBeInTheDocument();
    expect(screen.getByTestId('tab-cost')).toBeInTheDocument();
    expect(screen.getByTestId('tab-more')).toBeInTheDocument();

    expect(screen.getByText('Pomiary')).toBeInTheDocument();
    expect(screen.getByText('Projekt 3D')).toBeInTheDocument();
    expect(screen.getByText('Akcje')).toBeInTheDocument();
    expect(screen.getByText('Kosztorys')).toBeInTheDocument();
    expect(screen.getByText('Więcej')).toBeInTheDocument();
  });

  it('highlights the active step and triggers haptic feedback on tab press', () => {
    render(<MobileBottomNav {...defaultProps} activeStep="measure" />);

    const measureTab = screen.getByTestId('tab-measure');
    expect(measureTab.className).toContain('text-teal-400');

    const designTab = screen.getByTestId('tab-design');
    fireEvent.click(designTab);

    expect(defaultProps.onSelectStep).toHaveBeenCalledWith('design');
    expect(navigator.vibrate).toHaveBeenCalledWith(12);
  });

  it('switches to cost step when cost tab is clicked', () => {
    render(<MobileBottomNav {...defaultProps} activeStep="measure" />);

    const costTab = screen.getByTestId('tab-cost');
    fireEvent.click(costTab);

    expect(defaultProps.onSelectStep).toHaveBeenCalledWith('cost');
    expect(navigator.vibrate).toHaveBeenCalledWith(12);
  });

  it('opens Quick Actions Bottom Sheet when central elevated FAB is clicked', () => {
    render(<MobileBottomNav {...defaultProps} />);

    expect(screen.queryByTestId('quick-actions-sheet')).not.toBeInTheDocument();

    const fab = screen.getByTestId('tab-fab');
    fireEvent.click(fab);

    expect(screen.getByTestId('quick-actions-sheet')).toBeInTheDocument();
    expect(screen.getByText('Szybkie Akcje Remontowe')).toBeInTheDocument();
    expect(screen.getByTestId('action-quick-expense')).toBeInTheDocument();
    expect(screen.getByTestId('action-ar-scanner')).toBeInTheDocument();
    expect(screen.getByTestId('action-report')).toBeInTheDocument();
    expect(screen.getByTestId('action-ai-consultant')).toBeInTheDocument();
    expect(screen.getByTestId('action-wake-lock')).toBeInTheDocument();
  });

  it('executes quick actions from the bottom sheet correctly', () => {
    render(<MobileBottomNav {...defaultProps} />);

    // Open FAB
    fireEvent.click(screen.getByTestId('tab-fab'));

    // 1. Quick expense
    fireEvent.click(screen.getByTestId('action-quick-expense'));
    expect(defaultProps.onOpenQuickExpense).toHaveBeenCalled();
    expect(screen.queryByTestId('quick-actions-sheet')).not.toBeInTheDocument();

    // Reopen FAB
    fireEvent.click(screen.getByTestId('tab-fab'));

    // 2. AR Scanner
    fireEvent.click(screen.getByTestId('action-ar-scanner'));
    expect(defaultProps.onOpenScanner).toHaveBeenCalled();
    expect(screen.queryByTestId('quick-actions-sheet')).not.toBeInTheDocument();

    // Reopen FAB
    fireEvent.click(screen.getByTestId('tab-fab'));

    // 3. Report
    fireEvent.click(screen.getByTestId('action-report'));
    expect(defaultProps.onOpenReportModal).toHaveBeenCalled();

    // Reopen FAB
    fireEvent.click(screen.getByTestId('tab-fab'));

    // 4. AI Consultant
    fireEvent.click(screen.getByTestId('action-ai-consultant'));
    expect(defaultProps.onOpenAIModal).toHaveBeenCalled();

    // Reopen FAB
    fireEvent.click(screen.getByTestId('tab-fab'));

    // 5. Wake Lock toggle
    fireEvent.click(screen.getByTestId('action-wake-lock'));
    expect(defaultProps.onToggleWakeLock).toHaveBeenCalled();
  });

  it('opens Więcej (Moduły & Narzędzia) Sheet and navigates to submodules', () => {
    render(<MobileBottomNav {...defaultProps} />);

    expect(screen.queryByTestId('more-menu-sheet')).not.toBeInTheDocument();

    const moreTab = screen.getByTestId('tab-more');
    fireEvent.click(moreTab);

    expect(screen.getByTestId('more-menu-sheet')).toBeInTheDocument();
    expect(screen.getByText('Więcej Modułów & Narzędzi')).toBeInTheDocument();

    // Check module navigation
    fireEvent.click(screen.getByTestId('more-step-plan'));
    expect(defaultProps.onSelectStep).toHaveBeenCalledWith('plan');
    expect(screen.queryByTestId('more-menu-sheet')).not.toBeInTheDocument();

    // Reopen More menu
    fireEvent.click(screen.getByTestId('tab-more'));
    fireEvent.click(screen.getByTestId('more-step-progress'));
    expect(defaultProps.onSelectStep).toHaveBeenCalledWith('progress');

    // Reopen More menu
    fireEvent.click(screen.getByTestId('tab-more'));
    fireEvent.click(screen.getByTestId('more-step-qa'));
    expect(defaultProps.onSelectStep).toHaveBeenCalledWith('qa');
  });

  it('triggers backup, project switcher, and theme toggle from Więcej menu', () => {
    render(<MobileBottomNav {...defaultProps} theme="dark" />);

    fireEvent.click(screen.getByTestId('tab-more'));

    // Backup
    fireEvent.click(screen.getByTestId('more-backup'));
    expect(defaultProps.onOpenBackupModal).toHaveBeenCalled();

    // Reopen
    fireEvent.click(screen.getByTestId('tab-more'));

    // Project Switcher
    fireEvent.click(screen.getByTestId('more-project-switcher'));
    expect(defaultProps.onOpenProjectSwitcher).toHaveBeenCalled();

    // Reopen
    fireEvent.click(screen.getByTestId('tab-more'));

    // Theme Toggle
    fireEvent.click(screen.getByTestId('more-theme-toggle'));
    expect(defaultProps.onToggleTheme).toHaveBeenCalled();
  });

  it('displays active submodule indicator on the Więcej tab when plan, progress, or qa is active', () => {
    const { rerender } = render(<MobileBottomNav {...defaultProps} activeStep="plan" />);
    expect(screen.getByTestId('tab-more').className).toContain('text-teal-400');
    expect(screen.getByText('Harmonogram')).toBeInTheDocument();

    rerender(<MobileBottomNav {...defaultProps} activeStep="progress" />);
    expect(screen.getByText('Dziennik')).toBeInTheDocument();

    rerender(<MobileBottomNav {...defaultProps} activeStep="qa" />);
    expect(screen.getByText('Odbiory')).toBeInTheDocument();
  });

  it('closes sheets when Escape key is pressed', () => {
    render(<MobileBottomNav {...defaultProps} />);

    // Open Quick Actions
    fireEvent.click(screen.getByTestId('tab-fab'));
    expect(screen.getByTestId('quick-actions-sheet')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('quick-actions-sheet')).not.toBeInTheDocument();

    // Open More Menu
    fireEvent.click(screen.getByTestId('tab-more'));
    expect(screen.getByTestId('more-menu-sheet')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('more-menu-sheet')).not.toBeInTheDocument();
  });
});
