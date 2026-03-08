// services/awsAnalytics.js
// Fetches EC2 CPU, network, instance status, and monthly cost from AWS
// Cost Explorer is optional — if not enabled, monthlyCost returns "N/A"

import { EC2Client, DescribeInstanceStatusCommand } from "@aws-sdk/client-ec2";
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";

const region     = process.env.AWS_REGION;
const instanceId = process.env.EC2_INSTANCE_ID;

const ec2          = new EC2Client({ region });
const cloudwatch   = new CloudWatchClient({ region });
// Cost Explorer is a global service — always us-east-1
const costExplorer = new CostExplorerClient({ region: "us-east-1" });

// ── Helper: fetch a single CloudWatch metric safely ───────────────────────────
async function getCWMetric(metricName, stat) {
  try {
    const params = {
      Namespace:  "AWS/EC2",
      MetricName: metricName,
      Dimensions: [{ Name: "InstanceId", Value: instanceId }],
      StartTime:  new Date(Date.now() - 1000 * 60 * 60), // last 1 hour
      EndTime:    new Date(),
      Period:     300,
      Statistics: [stat],
    };
    const data   = await cloudwatch.send(new GetMetricStatisticsCommand(params));
    const sorted = (data.Datapoints || []).sort((a, b) => b.Timestamp - a.Timestamp);
    return sorted[0]?.[stat] ?? 0;
  } catch (err) {
    console.error(`CloudWatch ${metricName} error:`, err.message);
    return 0;
  }
}

// ── Helper: fetch EC2 instance status safely ─────────────────────────────────
async function getInstanceStatus() {
  try {
    const res = await ec2.send(
      new DescribeInstanceStatusCommand({ InstanceIds: [instanceId] })
    );
    return res.InstanceStatuses?.[0]?.InstanceState?.Name ?? "unknown";
  } catch (err) {
    console.error("EC2 status error:", err.message);
    return "unknown";
  }
}

// ── Helper: fetch monthly cost safely (Cost Explorer must be enabled) ─────────
async function getMonthlyCost() {
  try {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split("T")[0];
    const end   = now.toISOString().split("T")[0];

    // Start and end cannot be the same date
    if (start === end) return "0.00";

    const res = await costExplorer.send(
      new GetCostAndUsageCommand({
        TimePeriod:  { Start: start, End: end },
        Granularity: "MONTHLY",
        Metrics:     ["UnblendedCost"],
      })
    );
    return parseFloat(
      res.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount ?? "0"
    ).toFixed(2);
  } catch (err) {
    console.error("Cost Explorer error:", err.message);
    // Return N/A if Cost Explorer is not enabled or lacks permissions
    return "N/A";
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export const getAWSAnalytics = async () => {
  if (!instanceId) throw new Error("EC2_INSTANCE_ID not set in environment");
  if (!region)     throw new Error("AWS_REGION not set in environment");

  // Run all calls in parallel — each handles its own errors
  const [cpu, networkIn, networkOut, instanceStatus, monthlyCost] = await Promise.all([
    getCWMetric("CPUUtilization", "Average"),
    getCWMetric("NetworkIn",      "Sum"),
    getCWMetric("NetworkOut",     "Sum"),
    getInstanceStatus(),
    getMonthlyCost(),
  ]);

  return {
    cpu:            parseFloat((cpu || 0).toFixed(2)),
    networkIn:      Math.round(networkIn  || 0),
    networkOut:     Math.round(networkOut || 0),
    instanceStatus,
    monthlyCost,
  };
};