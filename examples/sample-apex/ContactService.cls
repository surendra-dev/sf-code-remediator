public class ContactService {
    
    public static void createContact(String firstName, String lastName, String email) {
        Contact con = new Contact(
            FirstName = firstName,
            LastName = lastName,
            Email = email
        );
        
        insert con;
    }
    
    public static List<Contact> getAllContacts() {
        return [SELECT Id, FirstName, LastName, Email FROM Contact];
    }
}

