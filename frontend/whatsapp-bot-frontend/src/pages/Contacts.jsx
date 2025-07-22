import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Users } from 'lucide-react';

const Contacts = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-gray-600">Gestiona tus contactos de WhatsApp</p>
        </div>
        <Button><Users className="h-4 w-4 mr-2" />Importar Contactos</Button>
      </div>

      <Card>
        <Card.Header><Card.Title>Lista de Contactos</Card.Title></Card.Header>
        <Card.Content>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Próximamente</h3>
              <p className="text-gray-600">La gestión de contactos estará disponible pronto</p>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Contacts; 