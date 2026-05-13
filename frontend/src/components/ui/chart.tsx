import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

/* =========================================
   THEMES
========================================= */

const THEMES = {
  light: "",
  dark: ".dark",
} as const;

/* =========================================
   TYPES
========================================= */

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

type SafePayloadItem = {
  name?: string;
  dataKey?: string;
  value?: number | string;
  color?: string;
};

type SafeTooltipProps = {
  active?: boolean;
  payload?: SafePayloadItem[];
  label?: string | number;
};

type SafeLegendItem = {
  dataKey?: string;
  color?: string;
};

type SafeLegendProps = {
  payload?: SafeLegendItem[];
};

/* =========================================
   CONTEXT
========================================= */

const ChartContext =
  React.createContext<ChartContextProps | null>(
    null
  );

function useChart() {
  const context =
    React.useContext(ChartContext);

  if (!context) {
    throw new Error(
      "useChart must be used within ChartContainer"
    );
  }

  return context;
}

/* =========================================
   CHART CONTAINER
========================================= */

const ChartContainer =
  React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> & {
      config: ChartConfig;
      data?: any[];
      children: React.ReactNode;
    }
  >(
    (
      {
        id,
        className,
        children,
        config,
        data,
        ...props
      },
      ref
    ) => {
      const uniqueId =
        React.useId();

      const chartId = `chart-${
        id ||
        uniqueId.replace(/:/g, "")
      }`;

      const isEmpty =
        !data ||
        data.length === 0;

      return (
        <ChartContext.Provider
          value={{ config }}
        >
          <div
            data-chart={chartId}
            ref={ref}
            className={cn(
              "relative flex min-h-[250px] w-full items-center justify-center overflow-hidden rounded-2xl",
              className
            )}
            {...props}
          >
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-sm font-medium text-muted-foreground">
                  No analytics available
                </div>

                <div className="mt-1 text-xs text-muted-foreground/70">
                  Therapy session data will appear here.
                </div>
              </div>
            ) : (
              <>
                <ChartStyle
                  id={chartId}
                  config={config}
                />

                <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
                  {children}
                </RechartsPrimitive.ResponsiveContainer>
              </>
            )}
          </div>
        </ChartContext.Provider>
      );
    }
  );

ChartContainer.displayName =
  "ChartContainer";

/* =========================================
   CHART STYLE
========================================= */

const ChartStyle = ({
  id,
  config,
}: {
  id: string;
  config: ChartConfig;
}) => {
  const colorConfig =
    Object.entries(config).filter(
      ([_, c]) => c.color
    );

  if (!colorConfig.length)
    return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(
          THEMES
        )
          .map(
            ([_, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, item]) =>
    item.color
      ? `--color-${key}: ${item.color};`
      : ""
  )
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  );
};

/* =========================================
   TOOLTIP
========================================= */

const ChartTooltip =
  RechartsPrimitive.Tooltip;

const ChartTooltipContent =
  React.forwardRef<
    HTMLDivElement,
    SafeTooltipProps
  >(
    (
      {
        active,
        payload,
        label,
      },
      ref
    ) => {
      const { config } =
        useChart();

      if (
        !active ||
        !payload ||
        payload.length === 0
      ) {
        return null;
      }

      return (
        <div
          ref={ref}
          className="min-w-[180px] rounded-2xl border border-border/50 bg-background/95 backdrop-blur px-4 py-3 shadow-xl"
        >
          {label !== undefined && (
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {label}
            </div>
          )}

          <div className="space-y-2">
            {payload.map(
              (item, index) => {
                const key =
                  item.dataKey ||
                  item.name ||
                  "value";

                const chart =
                  config[key];

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            item.color,
                        }}
                      />

                      <span className="text-xs text-muted-foreground">
                        {chart
                          ?.label ||
                          key}
                      </span>
                    </div>

                    <span className="text-xs font-semibold">
                      {item.value ??
                        0}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      );
    }
  );

ChartTooltipContent.displayName =
  "ChartTooltipContent";

/* =========================================
   LEGEND
========================================= */

const ChartLegend =
  RechartsPrimitive.Legend;

const ChartLegendContent =
  React.forwardRef<
    HTMLDivElement,
    SafeLegendProps
  >(
    ({ payload }, ref) => {
      const { config } =
        useChart();

      if (
        !payload ||
        payload.length === 0
      ) {
        return null;
      }

      return (
        <div
          ref={ref}
          className="flex flex-wrap items-center gap-4 pt-2 text-xs"
        >
          {payload.map(
            (
              item,
              index
            ) => {
              const key =
                item.dataKey ||
                "value";

              const label =
                config[key]
                  ?.label ||
                key;

              return (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1"
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        item.color,
                    }}
                  />

                  <span className="text-muted-foreground">
                    {label}
                  </span>
                </div>
              );
            }
          )}
        </div>
      );
    }
  );

ChartLegendContent.displayName =
  "ChartLegendContent";

/* =========================================
   CHART CARD
========================================= */

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "clinical-card rounded-2xl border border-border/50 bg-card p-6 shadow-sm",
        className
      )}
    >
      <div className="mb-5">
        <h2 className="text-base font-semibold">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}

/* =========================================
   EXPORTS
========================================= */

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartCard,
};