import Card from '../components/ui/Card';
import { MessageCircle } from 'lucide-react';

const Conversations = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conversaciones</h1>
        <p className="text-gray-600">Gestiona tus conversaciones de WhatsApp</p>
      </div>

      <Card>
        <Card.Header><Card.Title>Chat en Tiempo Real</Card.Title></Card.Header>
        <Card.Content>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Próximamente</h3>
              <p className="text-gray-600">El chat en tiempo real estará disponible pronto</p>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Conversations; 