import type { ReactNode } from "react";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { CHALLENGE_MISTAKE_COOLDOWN_MS } from "@/lib/constants/challenge";
import type { PairDTO } from "@/types";

interface MatchingGridProps {
  pairs: PairDTO[];
  completedPairs: Set<string>;
  disabled?: boolean;
  onMatchSuccess: (pairId: string) => void;
  onMatchFailure: () => void;
  leftLabel: ReactNode;
  rightLabel: ReactNode;
  obscureCells?: boolean;
}

type ColumnSide = "left" | "right";

interface Option {
  key: string;
  label: string;
  pairId: string;
  side: ColumnSide;
}

export function MatchingGrid({
  pairs,
  completedPairs,
  disabled = false,
  onMatchSuccess,
  onMatchFailure,
  leftLabel,
  rightLabel,
  obscureCells = false,
}: MatchingGridProps) {
  const leftOptions = useMemo(() => shuffleOptions(pairs, "left"), [pairs]);
  const rightOptions = useMemo(() => shuffleOptions(pairs, "right"), [pairs]);
  const optionMap = useMemo(() => {
    const map = new Map<string, Option>();
    [...leftOptions, ...rightOptions].forEach((option) => {
      map.set(option.key, option);
    });
    return map;
  }, [leftOptions, rightOptions]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [cooldownKeys, setCooldownKeys] = useState<Set<string>>(new Set());
  const cooldownTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      cooldownTimeouts.current.forEach(clearTimeout);
      cooldownTimeouts.current = [];
    };
  }, []);

  useEffect(() => {
    setSelectedLeft(null);
    setSelectedRight(null);
    setCooldownKeys(new Set());
    cooldownTimeouts.current.forEach(clearTimeout);
    cooldownTimeouts.current = [];
  }, [pairs]);

  useEffect(() => {
    if (!selectedLeft || !selectedRight) {
      return;
    }
    const left = optionMap.get(selectedLeft);
    const right = optionMap.get(selectedRight);
    if (!left || !right) {
      return;
    }

    if (left.pairId === right.pairId) {
      setSelectedLeft(null);
      setSelectedRight(null);
      onMatchSuccess(left.pairId);
      return;
    }

    setSelectedLeft(null);
    setSelectedRight(null);
    setCooldownKeys((prev) => {
      const next = new Set(prev);
      next.add(left.key);
      next.add(right.key);
      return next;
    });
    onMatchFailure();

    const timeoutId = setTimeout(() => {
      setCooldownKeys((prev) => {
        const next = new Set(prev);
        next.delete(left.key);
        next.delete(right.key);
        return next;
      });
    }, CHALLENGE_MISTAKE_COOLDOWN_MS);
    cooldownTimeouts.current.push(timeoutId);
  }, [selectedLeft, selectedRight, optionMap, onMatchFailure, onMatchSuccess]);

  function handleSelect(option: Option) {
    const isDisabled = disabled || completedPairs.has(option.pairId) || cooldownKeys.has(option.key);
    if (isDisabled) {
      return;
    }

    if (option.side === "left") {
      setSelectedLeft((prev) => (prev === option.key ? null : option.key));
      return;
    }
    setSelectedRight((prev) => (prev === option.key ? null : option.key));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-6">
        <ColumnHeader>{leftLabel}</ColumnHeader>
        <ColumnHeader>{rightLabel}</ColumnHeader>
      </div>
      <div className="space-y-3">
        {leftOptions.map((leftOption, index) => {
          const rightOption = rightOptions[index];
          return (
            <div key={`row-${index}`} className="grid grid-cols-2 gap-6">
              <OptionButton
                option={leftOption}
                selectedKey={selectedLeft}
                completedPairs={completedPairs}
                cooldownKeys={cooldownKeys}
                disabled={disabled}
                onSelect={handleSelect}
                obscure={obscureCells}
              />
              <OptionButton
                option={rightOption}
                selectedKey={selectedRight}
                completedPairs={completedPairs}
                cooldownKeys={cooldownKeys}
                disabled={disabled}
                onSelect={handleSelect}
                obscure={obscureCells}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColumnHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 text-center text-sm font-medium text-muted-foreground">
      {children}
    </div>
  );
}

function OptionButton({
  option,
  selectedKey,
  completedPairs,
  cooldownKeys,
  disabled,
  onSelect,
  obscure,
}: {
  option: Option;
  selectedKey: string | null;
  completedPairs: Set<string>;
  cooldownKeys: Set<string>;
  disabled: boolean;
  onSelect: (option: Option) => void;
  obscure: boolean;
}) {
  const isCompleted = completedPairs.has(option.pairId);
  const isSelected = selectedKey === option.key;
  const isCoolingDown = cooldownKeys.has(option.key);
  const isDisabled = disabled || isCompleted || isCoolingDown;

  return (
    <button
      type="button"
      disabled={isDisabled}
      data-testid={`matching-cell-${option.side}-${option.key}`}
      className={clsx(
        "w-full rounded-xl border px-4 py-3 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary break-words text-center",
        {
          "border-border bg-card hover:bg-accent": !isSelected && !isCompleted && !isCoolingDown && !disabled,
          "border-primary bg-primary/10 text-primary": isSelected,
          "border-emerald-200 bg-emerald-50 text-emerald-600": isCompleted,
          "border-destructive bg-destructive/10 text-destructive": isCoolingDown,
          "opacity-60": isDisabled && !isCompleted,
          "cursor-not-allowed": isDisabled,
        }
      )}
      onClick={() => onSelect(option)}
    >
      <span className={clsx("inline-block w-full break-words text-center", { "blur-sm select-none": obscure })}>
        {option.label}
      </span>
    </button>
  );
}

function shuffleOptions(pairs: PairDTO[], side: ColumnSide): Option[] {
  const base = pairs.map<Option>((pair, index) => ({
    key: `${side}-${pair.id}-${index}`,
    label: side === "left" ? pair.term_a : pair.term_b,
    pairId: pair.id,
    side,
  }));

  for (let i = base.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }

  return base;
}
