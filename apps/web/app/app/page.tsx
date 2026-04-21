import { demoDataset } from "@voicegauntlet/core";
import { GauntletConsole } from "../../components/gauntlet-console";

export default function AppPage() {
  return <GauntletConsole data={demoDataset} mode="app" />;
}
