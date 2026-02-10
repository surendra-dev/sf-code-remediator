/**
 * Sample Apex class demonstrating sharing violations
 * Missing sharing declaration
 */
public class ContactService {
    
    public static List<Contact> searchContacts(String searchTerm) {
        System.debug('Searching for: ' + searchTerm);
        
        // Potential SOQL injection - concatenating user input
        String query = 'SELECT Id, Name, Email FROM Contact WHERE Name LIKE \'%' + searchTerm + '%\'';
        return Database.query(query);
    }
    
    public static void deleteOldContacts(Date cutoffDate) {
        List<Contact> oldContacts = [SELECT Id FROM Contact WHERE CreatedDate < :cutoffDate];
        System.debug('Deleting ' + oldContacts.size() + ' contacts');
        delete oldContacts;
    }
    
    public static void bulkUpdateContacts(List<Contact> contacts) {
        for (Contact c : contacts) {
            c.Description = 'Updated';
        }
        update contacts;
    }
}
