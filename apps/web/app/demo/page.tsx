import { demoDataset } from "@voicegauntlet/core";
import { GauntletConsole } from "../../components/gauntlet-console";

export default function DemoPage() {
  return <GauntletConsole data={demoDataset} mode="demo" />;
}
