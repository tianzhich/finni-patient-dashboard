import { useEffect, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'finni-patient-dashboard:theme';
const PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];
const LABELS = { system: 'System', light: 'Light', dark: 'Dark' };
const ICONS = { system: Monitor, light: Sun, dark: Moon };

function storedPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    return PREFERENCES.includes(stored as ThemePreference) ? (stored as ThemePreference) : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeControl() {
  const [preference, setPreference] = useState<ThemePreference>(storedPreference);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');

    function applyTheme() {
      const resolved = preference === 'system' ? (media?.matches ? 'dark' : 'light') : preference;

      document.documentElement.dataset.theme = resolved;

      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', resolved === 'dark' ? '#11151c' : '#fbf7f0');
    }

    applyTheme();
    media?.addEventListener('change', applyTheme);

    return () => media?.removeEventListener('change', applyTheme);
  }, [preference]);

  function changePreference(next: ThemePreference) {
    setPreference(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The current session can still change theme when storage is unavailable.
    }
  }

  const Icon = ICONS[preference];
  const description = `Color theme: ${LABELS[preference]}`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="grid size-11 shrink-0 place-items-center rounded-full bg-transparent text-secondary hover:bg-surface-hover hover:text-primary data-[state=open]:bg-surface-hover"
          type="button"
          aria-label={description}
          title={description}
        >
          <Icon className="size-5" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 w-44 rounded-xl border border-border bg-surface p-1 shadow-lg"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          aria-label="Color theme"
        >
          <DropdownMenu.Label className="px-3 py-2 text-xs font-medium text-secondary">
            Appearance
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={preference}
            onValueChange={(value) => changePreference(value as ThemePreference)}
          >
            {PREFERENCES.map((value) => {
              const OptionIcon = ICONS[value];

              return (
                <DropdownMenu.RadioItem
                  key={value}
                  value={value}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-primary outline-none select-none data-[highlighted]:bg-surface-hover data-[state=checked]:font-medium"
                >
                  <OptionIcon className="size-4 text-secondary" aria-hidden="true" />
                  {LABELS[value]}
                  <DropdownMenu.ItemIndicator className="ml-auto">
                    <Check className="size-4" aria-hidden="true" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
