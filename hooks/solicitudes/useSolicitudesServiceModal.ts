import { useEffect, useState } from "react";
import { apiClientSafe } from "@/api/client";
import type { Cliente } from "@lasmunecasderamon/types";
import type { SolicitudItem } from "@/hooks/types/solicitudesTypes";

interface UseSolicitudesServiceModalParams {
  setSelectedClient: (cliente: Cliente | null) => void;
}

/** Modal de aprobación de servicios y el cliente asociado a la solicitud. */
export function useSolicitudesServiceModal({
  setSelectedClient,
}: UseSolicitudesServiceModalParams) {
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<SolicitudItem | null>(
    null,
  );
  const [loadingClient, setLoadingClient] = useState(false);

  useEffect(() => {
    if (!serviceModalVisible || !selectedService) return;
    const cId = selectedService.cliente_id || selectedService.id_cliente;
    if (!cId) {
      const t = setTimeout(() => setSelectedClient(null), 0);
      return () => clearTimeout(t);
    }

    const ac = new AbortController();
    const t = setTimeout(() => {
      setLoadingClient(true);
      apiClientSafe<Cliente>(`/clients?id=${cId}`, { signal: ac.signal })
        .then((res) => {
          if (res.success) setSelectedClient(res.data);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setSelectedClient(null);
        })
        .finally(() => setLoadingClient(false));
    }, 0);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [selectedService, serviceModalVisible, setSelectedClient]);

  return {
    serviceModalVisible,
    selectedService,
    loadingClient,
    setServiceModalVisible,
    setSelectedService,
    setLoadingClient,
  };
}
