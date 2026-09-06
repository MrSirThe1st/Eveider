import { openDispatcherWhatsApp, type DispatcherWhatsAppContext } from '../lib/support';
import { ActionRow } from './ActionRow';

type DispatcherContactButtonProps = {
  context?: DispatcherWhatsAppContext;
  last?: boolean;
};

export function DispatcherContactButton({ context, last }: DispatcherContactButtonProps) {
  return (
    <ActionRow
      icon="message-circle"
      label="Contacter le dispatch"
      hint="WhatsApp"
      onPress={() => openDispatcherWhatsApp(context)}
      last={last}
    />
  );
}
