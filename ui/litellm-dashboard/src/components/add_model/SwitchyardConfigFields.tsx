"use client";

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ModelChoiceCombobox, { type ModelChoice } from "./ModelChoiceCombobox";
import {
  stageConfidence,
  toggleClassifier,
  setClassifierKind,
  parseToolSemantics,
  type SwitchyardConfig,
} from "./switchyard_config";

interface Props {
  value: SwitchyardConfig;
  onChange: (value: SwitchyardConfig) => void;
  models: ModelChoice[];
  decisionModels: ModelChoice[];
  onToolSemanticsError: (error: string | null) => void;
}

const isStructured = (instructions: unknown): instructions is Record<string, unknown> =>
  typeof instructions === "object" && instructions !== null;
const instructionsText = (instructions: string | Record<string, unknown> | null | undefined): string =>
  isStructured(instructions) ? JSON.stringify(instructions, null, 2) : instructions ?? "";

export default function SwitchyardConfigFields({
  value,
  onChange,
  models,
  decisionModels,
  onToolSemanticsError,
}: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [toolSemantics, setToolSemantics] = useState(
    value.options.tool_semantics ? JSON.stringify(value.options.tool_semantics, null, 2) : "",
  );
  const classifier = value.classifier;
  const llm = classifier?.kind === "llm" ? classifier : undefined;
  const decision = classifier?.kind === "decision" ? classifier : undefined;
  const setOption = (key: "recent_window", text: string) =>
    onChange({ ...value, options: { ...value.options, [key]: text === "" ? undefined : Number(text) } });
  const setClassifierNumber = (
    key: "base_threshold" | "threshold_step" | "max_output_tokens" | "recent_turn_window",
    text: string,
  ) => {
    if (llm) onChange({ ...value, classifier: { ...llm, [key]: text === "" ? undefined : Number(text) } });
  };
  const changeToolSemantics = (text: string) => {
    setToolSemantics(text);
    try {
      const parsed = parseToolSemantics(text);
      onChange({ ...value, options: { ...value.options, tool_semantics: parsed } });
      onToolSemanticsError(null);
    } catch {
      onToolSemanticsError(t("switchyardConfig.toolSemanticsError"));
    }
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <span id={`${id}-heuristic`} className="text-sm font-medium">
            {t("switchyardConfig.heuristic")}
          </span>
          <p
            aria-labelledby={`${id}-heuristic`}
            className="flex min-h-10 items-center rounded-md border bg-muted/30 px-3 py-2 text-sm"
          >
            {t("switchyardConfig.stageRouter")}
          </p>
        </div>
        <div className="min-w-0 space-y-2">
          <label htmlFor={`${id}-bias`} className="text-sm font-medium">
            {t("switchyardConfig.bias")}
          </label>
          <Select
            value={value.options.picker}
            items={[
              { value: "efficient_first", label: t("switchyardConfig.costFirst") },
              { value: "capable_first", label: t("switchyardConfig.qualityFirst") },
            ]}
            onValueChange={(picker) =>
              onChange({
                ...value,
                options: { ...value.options, picker: picker === "capable_first" ? "capable_first" : "efficient_first" },
              })
            }
          >
            <SelectTrigger
              id={`${id}-bias`}
              className="h-auto min-h-10 w-full py-2 *:data-[slot=select-value]:line-clamp-none"
            >
              <SelectValue className="whitespace-normal break-words" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="efficient_first">{t("switchyardConfig.costFirst")}</SelectItem>
              <SelectItem value="capable_first">
                <span className="whitespace-normal">{t("switchyardConfig.qualityFirst")}</span>
              </SelectItem>
            </SelectContent>
          </Select>
          {value.options.picker === "capable_first" && (
            <p className="text-sm text-muted-foreground">{t("switchyardConfig.uncalibratedBias")}</p>
          )}
        </div>
        {(["capable", "efficient"] as const).map((tier) => (
          <div key={tier} className="min-w-0 space-y-2">
            <label htmlFor={`${id}-${tier}`} className="text-sm font-medium">
              {t(tier === "capable" ? "switchyardConfig.capableModel" : "switchyardConfig.efficientModel")}
            </label>
            <ModelChoiceCombobox
              id={`${id}-${tier}`}
              value={value.models[tier]}
              onChange={(model) => onChange({ ...value, models: { ...value.models, [tier]: model ?? "" } })}
              choices={models}
              placeholder={t("switchyardConfig.selectModel")}
              ariaInvalid={undefined}
              ariaDescribedBy={undefined}
            />
          </div>
        ))}
      </div>
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label htmlFor={`${id}-classifier`} className="text-sm font-medium">
              {t("switchyardConfig.classifier")}
            </label>
            <p className="text-sm text-muted-foreground">{t("switchyardConfig.classifierHelp")}</p>
          </div>
          <Switch
            id={`${id}-classifier`}
            checked={Boolean(classifier)}
            onCheckedChange={(enabled) => onChange(toggleClassifier(value, enabled))}
          />
        </div>
        {classifier && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <label htmlFor={`${id}-classifier-kind`} className="text-sm font-medium">
                {t("switchyardConfig.classifierType")}
              </label>
              <Select
                value={classifier.kind}
                items={[
                  { value: "llm", label: t("switchyardConfig.llmJudge") },
                  { value: "decision", label: t("switchyardConfig.decisionModel") },
                ]}
                onValueChange={(kind) => onChange(setClassifierKind(value, kind === "decision" ? "decision" : "llm"))}
              >
                <SelectTrigger id={`${id}-classifier-kind`} className="min-h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="llm">{t("switchyardConfig.llmJudge")}</SelectItem>
                  <SelectItem value="decision">{t("switchyardConfig.decisionModel")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <label htmlFor={`${id}-judge`} className="text-sm font-medium">
                {t(decision ? "switchyardConfig.decisionModel" : "switchyardConfig.judgeModel")}
              </label>
              <ModelChoiceCombobox
                id={`${id}-judge`}
                value={value.models.judge ?? ""}
                onChange={(judge) => onChange({ ...value, models: { ...value.models, judge: judge ?? "" } })}
                choices={decision ? decisionModels : models}
                placeholder={t(decision ? "switchyardConfig.selectDecisionModel" : "switchyardConfig.selectJudgeModel")}
                ariaInvalid={undefined}
                ariaDescribedBy={undefined}
              />
            </div>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span id={`${id}-confidence`} className="text-sm font-medium">
            {t("switchyardConfig.confidenceThreshold")}
          </span>
          <span className="text-sm tabular-nums">{stageConfidence(value).toFixed(2)}</span>
        </div>
        <Slider
          aria-labelledby={`${id}-confidence`}
          value={[stageConfidence(value)]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(next) =>
            onChange({
              ...value,
              options: { ...value.options, confidence_threshold: Array.isArray(next) ? next[0] : next },
            })
          }
        />
        <p className="text-sm text-muted-foreground">
          {t(classifier ? "switchyardConfig.confidenceWithJudge" : "switchyardConfig.confidenceWithBias")}
        </p>
      </div>
      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-medium">{t("switchyardConfig.advancedSettings")}</summary>
        <div className="mt-5 space-y-5">
          <h3 className="text-sm font-semibold">{t("switchyardConfig.stage")}</h3>
          <div className="min-w-0 space-y-2">
            <label htmlFor={`${id}-recent`}>{t("switchyardConfig.recentWindow")}</label>
            <Input
              id={`${id}-recent`}
              type="number"
              min={1}
              value={value.options.recent_window ?? ""}
              placeholder={t("switchyardConfig.libraryDefault")}
              onChange={(event) => setOption("recent_window", event.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor={`${id}-tools`}>{t("switchyardConfig.toolSemantics")}</label>
            <Textarea
              id={`${id}-tools`}
              value={toolSemantics}
              placeholder={'{"observe": ["read_file"], "mutate": ["edit_file"]}'}
              onChange={(event) => changeToolSemantics(event.target.value)}
            />
          </div>
          {decision && (
            <>
              <h3 className="text-sm font-semibold">{t("switchyardConfig.decisionModel")}</h3>
              <div className="min-w-0 space-y-2">
                <label htmlFor={`${id}-cutoff`}>{t("switchyardConfig.advantageCutoff")}</label>
                <Input
                  id={`${id}-cutoff`}
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={decision.cutoff}
                  onChange={(event) =>
                    onChange({ ...value, classifier: { ...decision, cutoff: Number(event.target.value) } })
                  }
                />
                <p className="text-sm text-muted-foreground">{t("switchyardConfig.advantageHelp")}</p>
              </div>
              <div className="min-w-0 space-y-2">
                <label htmlFor={`${id}-instructions`}>{t("switchyardConfig.decisionInstructions")}</label>
                <Textarea
                  id={`${id}-instructions`}
                  readOnly={isStructured(decision.instructions)}
                  value={instructionsText(decision.instructions)}
                  placeholder={t("switchyardConfig.defaultInstructions")}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      classifier: { ...decision, instructions: event.target.value || undefined },
                    })
                  }
                />
              </div>
            </>
          )}
          {llm && (
            <>
              <h3 className="text-sm font-semibold">{t("switchyardConfig.classifier")}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    ["base_threshold", t("switchyardConfig.capabilityThreshold")],
                    ["threshold_step", t("switchyardConfig.thresholdStep")],
                    ["max_output_tokens", t("switchyardConfig.maxOutputTokens")],
                    ["recent_turn_window", t("switchyardConfig.recentTurnWindow")],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="min-w-0 space-y-2">
                    <label htmlFor={`${id}-${key}`}>{label}</label>
                    <Input
                      id={`${id}-${key}`}
                      type="number"
                      min={key.includes("threshold") ? 0 : 1}
                      max={key.includes("threshold") ? 1 : undefined}
                      step={key.includes("threshold") ? 0.01 : 1}
                      value={llm[key] ?? ""}
                      onChange={(event) => setClassifierNumber(key, event.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="min-w-0 space-y-2">
                <label htmlFor={`${id}-format`}>{t("switchyardConfig.responseFormat")}</label>
                <Select
                  value={llm.response_format_type}
                  items={[
                    { value: "json_schema", label: t("switchyardConfig.jsonSchema") },
                    { value: "json_object", label: t("switchyardConfig.jsonObject") },
                  ]}
                  onValueChange={(format) =>
                    onChange({
                      ...value,
                      classifier: {
                        ...llm,
                        response_format_type: format === "json_object" ? "json_object" : "json_schema",
                      },
                    })
                  }
                >
                  <SelectTrigger id={`${id}-format`} className="min-h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json_schema">{t("switchyardConfig.jsonSchema")}</SelectItem>
                    <SelectItem value="json_object">{t("switchyardConfig.jsonObject")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <label htmlFor={`${id}-prompt`}>{t("switchyardConfig.classifierPrompt")}</label>
                <Textarea
                  id={`${id}-prompt`}
                  value={llm.prompt ?? ""}
                  placeholder={t("switchyardConfig.defaultPrompt")}
                  onChange={(event) =>
                    onChange({ ...value, classifier: { ...llm, prompt: event.target.value || undefined } })
                  }
                />
              </div>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
