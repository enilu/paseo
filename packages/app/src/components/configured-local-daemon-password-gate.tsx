import { AddHostModal } from "@/components/add-host-modal";
import {
  getConfiguredLocalDaemonEndpoint,
  hasConfiguredLocalDaemonPassword,
  isConfiguredLocalDaemonPasswordRequired,
  normalizeConfiguredLocalDaemonEndpoint,
} from "@/runtime/configured-local-daemon";
import { useHostRegistryStatus, useHosts } from "@/runtime/host-runtime";

function keepPasswordGateOpen(): void {}

export function ConfiguredLocalDaemonPasswordGate() {
  const hosts = useHosts();
  const hostRegistryStatus = useHostRegistryStatus();
  const configuredEndpoint = getConfiguredLocalDaemonEndpoint();
  const endpoint = configuredEndpoint
    ? normalizeConfiguredLocalDaemonEndpoint(configuredEndpoint)
    : null;
  const passwordRequired = isConfiguredLocalDaemonPasswordRequired();
  const hasPassword = endpoint ? hasConfiguredLocalDaemonPassword(hosts, endpoint) : false;
  const visible =
    hostRegistryStatus === "ready" && passwordRequired && endpoint !== null && !hasPassword;

  if (!endpoint) {
    return null;
  }

  return (
    <AddHostModal
      visible={visible}
      onClose={keepPasswordGateOpen}
      initialEndpoint={endpoint}
      lockEndpoint
      requirePassword
      showCancel={false}
    />
  );
}
