/**
 * Sample class with trailing whitespace issues
 */
public class OpportunityHandler {
    
    public static void processOpportunity(Opportunity opp) {
        System.debug('Processing opportunity');    
        
        if (opp.Amount > 100000) {    
            opp.Description = 'Large opportunity';   
        }   
        
        update opp;   
    }
    
    public static List<Opportunity> getClosedOpportunities() {   
        System.debug('Fetching closed opportunities');   
        return [SELECT Id, Name, Amount FROM Opportunity WHERE IsClosed = true];   
    }   
}
