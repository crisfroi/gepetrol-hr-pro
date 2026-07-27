-- Create schema for reference data if it doesn't exist
CREATE SCHEMA IF NOT EXISTS reference_data;

-- Create Equatorial Guinea names table
CREATE TABLE IF NOT EXISTS reference_data.equatorial_guinea_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_names text[] NOT NULL DEFAULT ARRAY[
    'Obed', 'Adolfo', 'Juan', 'Miguel', 'Carlos', 'José', 'Francisco', 'Antonio', 'Manuel', 'Luis',
    'Roberto', 'Gabriel', 'Ramón', 'Fernando', 'Alejandro', 'Javier', 'Pablo', 'Ricardo', 'Sergio', 'Andrés',
    'Benito', 'Víctor', 'Claudio', 'Daniel', 'Emilio', 'Enrique', 'Ernesto', 'Eugenio', 'Felipe', 'Fidel',
    'Florentino', 'Fortunato', 'Fulgencio', 'Gaspar', 'Geraldo', 'Germán', 'Gilberto', 'Gómez', 'Gonzalo', 'Gregorio',
    'Guido', 'Guillermo', 'Gustavo', 'Héctor', 'Heraclio', 'Hermalindo', 'Hermano', 'Herminio', 'Hilario', 'Hildebrando',
    'Hipólito', 'Homero', 'Horacio', 'Humberto', 'Ildefonso', 'Ignacio', 'Inocencio', 'Isaac', 'Isaías', 'Ismael',
    'Isidoro', 'Israel', 'Jaime', 'Javier', 'Jerónimo', 'Jesús', 'Joaquín', 'Jorge', 'Josefo', 'Josué',
    'Jovencio', 'Jovino', 'Juan', 'Juancho', 'Jude', 'Justo', 'Juvencio', 'Juventino', 'Lado', 'Laureano',
    'Laurentino', 'Lauro', 'Leandro', 'Leobardo', 'Leocadio', 'Leodegario', 'Leomardo', 'Leoncio', 'Leonel', 'Leonardo',
    'Leónidas', 'Leopoldo', 'Leticio', 'Letrán', 'Leuvino', 'Libano', 'Liberto', 'Libio', 'Librado', 'Licinio',
    'Lidoro', 'Liduino', 'Liferino', 'Lifidio', 'Liguorio', 'Lilino', 'Limardo', 'Linares', 'Lindo', 'Lino',
    'Lirio', 'Lisandro', 'Lisímaco', 'Lisomaco', 'Lister', 'Litardo', 'Litmaro', 'Livano', 'Livio', 'Lizardo',
    'Llano', 'Lluís', 'Loaces', 'Lobato', 'Locadio', 'Lodovico', 'Loendro', 'Logino', 'Lojano', 'Lombardo',
    'Lominado', 'Lonarco', 'Lonardo', 'Loncio', 'Lonuario', 'Lopo', 'Loreano', 'Loren', 'Lorena', 'Lorencio',
    'Loreno', 'Lores', 'Loreta', 'Loreto', 'Lorgano', 'Lorico', 'Lorio', 'Loris', 'Lorito', 'Loro'
  ],
  last_names text[] NOT NULL DEFAULT ARRAY[
    'Ndong', 'Nguema', 'Eyegue', 'Owono', 'Asumu', 'Ibá', 'Moto', 'Meléndez', 'García', 'López',
    'Martínez', 'González', 'Rodríguez', 'Fernández', 'Pérez', 'Sánchez', 'Ruiz', 'Ramírez', 'Cortés', 'Díaz',
    'Moreno', 'Gutiérrez', 'Jiménez', 'Domínguez', 'Benítez', 'Muñoz', 'Castillo', 'Medina', 'Navarro', 'Herrera',
    'Flores', 'Rivera', 'Delgado', 'Ramos', 'Rubio', 'Gómez', 'Vargas', 'Guerrero', 'Campos', 'Molina',
    'Carrillo', 'Soto', 'Vega', 'Aguilar', 'Cabrera', 'Cervantes', 'Contreras', 'Cordero', 'Cuevas', 'Duarte',
    'Esparza', 'Espinosa', 'Estrada', 'Falcón', 'Farrera', 'Feria', 'Ferrer', 'Figueroa', 'Flores', 'Franco',
    'Fuentes', 'Galarza', 'Gálvez', 'Gamboa', 'Gamez', 'Garbanzo', 'Garcés', 'García', 'Gargallo', 'Garrafa',
    'Garrama', 'Garrido', 'Garriga', 'Garrote', 'Garruchos', 'Garzón', 'Gasca', 'Gascón', 'Gaspar', 'Gastaño',
    'Gatea', 'Gatesno', 'Gatiñas', 'Gatlinburg', 'Gavás', 'Gaviño', 'Gavira', 'Gaya', 'Gayán', 'Gayanes',
    'Gayano', 'Gayo', 'Gazcón', 'Gazitano', 'Gazpachero', 'Gazullo', 'Gbandji', 'Gbara', 'Gbarambay', 'Gbarango',
    'Gbarian', 'Gbaroni', 'Gbarote', 'Gbarukila', 'Gbarzamba', 'Gbata', 'Gbatanga', 'Gbatanian', 'Gbatano', 'Gbe'
  ],
  regions text[] NOT NULL DEFAULT ARRAY[
    'Bioko Norte', 'Bioko Sur', 'Litoral', 'Centro Sur', 'Kié-Ntem', 'Wele-Nzas', 'Región Autónoma de Annobón'
  ],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON reference_data.equatorial_guinea_names TO authenticated;
GRANT SELECT ON reference_data.equatorial_guinea_names TO service_role;

-- Function to get a random first name
CREATE OR REPLACE FUNCTION reference_data.get_random_first_name()
RETURNS text AS $$
DECLARE
  v_names text[];
  v_index int;
BEGIN
  SELECT first_names INTO v_names FROM reference_data.equatorial_guinea_names LIMIT 1;
  v_index := floor(random() * array_length(v_names, 1)) + 1;
  RETURN v_names[v_index];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = reference_data, public;

-- Function to get a random last name
CREATE OR REPLACE FUNCTION reference_data.get_random_last_name()
RETURNS text AS $$
DECLARE
  v_names text[];
  v_index int;
BEGIN
  SELECT last_names INTO v_names FROM reference_data.equatorial_guinea_names LIMIT 1;
  v_index := floor(random() * array_length(v_names, 1)) + 1;
  RETURN v_names[v_index];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = reference_data, public;

-- Function to get a random region
CREATE OR REPLACE FUNCTION reference_data.get_random_region()
RETURNS text AS $$
DECLARE
  v_regions text[];
  v_index int;
BEGIN
  SELECT regions INTO v_regions FROM reference_data.equatorial_guinea_names LIMIT 1;
  v_index := floor(random() * array_length(v_regions, 1)) + 1;
  RETURN v_regions[v_index];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = reference_data, public;
