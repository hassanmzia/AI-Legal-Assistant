"""
Management command to seed the legal knowledge base with sample legal documents
and create a sample case for demonstration purposes.
"""
import uuid
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


# Legal knowledge base documents ported from the notebook
LEGAL_KNOWLEDGE_BASE = [
    {
        "content": """Force Majeure in Contract Law: Force majeure clauses excuse performance when
extraordinary events beyond the parties' control prevent fulfillment of contractual obligations.
Key elements include: (1) The event must be unforeseeable and beyond reasonable control,
(2) The event must actually prevent or impede performance, (3) The affected party must provide
timely notice, (4) The party must demonstrate mitigation efforts. Courts have historically
interpreted force majeure narrowly, requiring specific enumeration of qualifying events.
The COVID-19 pandemic expanded judicial interpretation to include public health emergencies.
Notable cases: Hess Corp. v. Port Authority (2021) - pandemic qualified as force majeure;
JN Contemporary Art v. Phillips (2020) - auction house successfully invoked force majeure
due to gallery closures.""",
        "metadata": {"source": "Legal Textbook - Contract Law", "topic": "force_majeure"}
    },
    {
        "content": """Breach of Contract - Notice Requirements: Proper notice is a critical
procedural requirement in breach of contract claims. Most commercial contracts require written
notice within a specified timeframe (typically 30-90 days). Failure to provide adequate notice
may result in waiver of claims or dismissal. Notice must generally include: (1) Specific
identification of the breach, (2) The contractual provision violated, (3) Demanded remedy
or cure period, (4) Statement of intent to pursue legal remedies if not cured.
The Uniform Commercial Code (UCC) Section 2-607(3)(a) requires buyers to notify sellers of
breach within a reasonable time. Electronic notice may satisfy requirements if the contract
permits it. Courts evaluate the reasonableness of notice timing based on the circumstances.""",
        "metadata": {"source": "Legal Textbook - Contract Law", "topic": "notice_requirements"}
    },
    {
        "content": """Burden of Proof and Evidence Standards: In civil litigation, the plaintiff
bears the burden of proving their case by a preponderance of the evidence (more likely than not,
>50%). In contract disputes, this includes proving: (1) Existence of a valid contract,
(2) Performance by the plaintiff or valid excuse for non-performance, (3) Breach by the
defendant, (4) Resulting damages. Documentary evidence is preferred over testimonial evidence.
Courts require specific evidence of damages - speculative or conjectural damages are not
recoverable. Expert testimony may be required for complex damage calculations. The parol
evidence rule limits the use of extrinsic evidence to contradict written contract terms.
Best evidence rule requires production of original documents when available.""",
        "metadata": {"source": "Legal Textbook - Evidence Law", "topic": "burden_of_proof"}
    },
    {
        "content": """Contributory Negligence and Comparative Fault: In jurisdictions following
contributory negligence, a plaintiff's own negligence completely bars recovery. Most states
now follow comparative fault, either pure (plaintiff can recover even if 99% at fault, reduced
by their percentage) or modified (plaintiff barred if 50% or 51% at fault, depending on
jurisdiction). In contract cases, the concept appears as failure to mitigate damages.
A non-breaching party has a duty to take reasonable steps to minimize losses. Failure to
mitigate may reduce recoverable damages. The duty to mitigate does not require the
non-breaching party to take unreasonable or burdensome actions. Key case: Rockingham County v.
Luten Bridge Co. (1929) established the duty to mitigate in contract law.""",
        "metadata": {"source": "Legal Textbook - Tort Law", "topic": "contributory_negligence"}
    },
    {
        "content": """Damages in Contract Law: Contract damages aim to put the non-breaching
party in the position they would have been in had the contract been performed. Types include:
(1) Expectation damages - lost profits and benefit of the bargain, (2) Reliance damages -
expenses incurred in reliance on the contract, (3) Consequential damages - foreseeable indirect
losses (Hadley v. Baxendale standard), (4) Liquidated damages - pre-agreed amounts if
reasonable estimate of actual damages, (5) Restitution - value of benefit conferred.
Punitive damages are generally not available in contract cases except where the breach also
constitutes a tort. Damages must be proven with reasonable certainty - the lost profits
doctrine requires showing established business with track record. Mitigation duty applies.""",
        "metadata": {"source": "Legal Textbook - Remedies", "topic": "damages"}
    },
    {
        "content": """Supply Chain Disruption and Commercial Impracticability: Under UCC 2-615,
a seller may be excused from performance when it becomes commercially impracticable due to
unforeseen circumstances. Requirements: (1) An event must occur whose non-occurrence was a
basic assumption of the contract, (2) Performance must be made impracticable, not merely
more expensive, (3) The party must not have assumed the risk. The Restatement (Second) of
Contracts Section 261 provides similar relief. Recent supply chain disruptions due to
COVID-19, the Suez Canal blockage, and semiconductor shortages have revived interest in this
doctrine. Courts distinguish between subjective impossibility (personal inability) and
objective impossibility (no one could perform). Price increases alone typically do not
constitute impracticability unless extreme (courts have suggested 10x or more).""",
        "metadata": {"source": "Legal Textbook - Commercial Law", "topic": "supply_chain"}
    },
    {
        "content": """Statute of Limitations for Contract Claims: Statutes of limitations vary
by jurisdiction and contract type. Written contracts typically have a 4-6 year limitation
period. Oral contracts generally have shorter periods (2-3 years). The UCC provides a 4-year
limitation for sale of goods contracts (UCC 2-725), which may be reduced to 1 year by
agreement but not extended. The limitation period generally begins to run when the breach
occurs (the 'discovery rule' may delay commencement in some jurisdictions). Tolling may
apply for: (1) Fraudulent concealment of the breach, (2) Defendant's absence from the
jurisdiction, (3) Plaintiff's minority or incapacity, (4) Continuing breach. The statute
of repose provides an absolute outer time limit regardless of discovery.""",
        "metadata": {"source": "Legal Textbook - Civil Procedure", "topic": "statute_of_limitations"}
    },
    {
        "content": """Jurisdictional Analysis in Contract Disputes: Courts must have both
subject matter jurisdiction and personal jurisdiction. Federal courts have diversity
jurisdiction when parties are from different states and amount in controversy exceeds $75,000.
Forum selection clauses are generally enforceable under the Bremen v. Zapata standard unless
unreasonable or obtained through fraud. Choice of law clauses determine which state's
substantive law applies. Minimum contacts analysis (International Shoe) governs personal
jurisdiction over out-of-state defendants. Long-arm statutes extend jurisdiction to the
limits of due process. For contract disputes, relevant factors include where the contract
was negotiated, executed, and to be performed. The Erie doctrine requires federal courts
sitting in diversity to apply state substantive law.""",
        "metadata": {"source": "Legal Textbook - Civil Procedure", "topic": "jurisdiction"}
    },
]

SAMPLE_CASE_TEXT = """TechCorp Inc. v. GlobalSupply Ltd. - Contract Dispute Case

BACKGROUND:
TechCorp Inc. (Plaintiff) entered into a five-year supply agreement with GlobalSupply Ltd.
(Defendant) on January 15, 2020, for the procurement of specialized semiconductor components.
The contract specified quarterly deliveries of 10,000 units at $45 per unit, with a force
majeure clause covering "acts of God, war, terrorism, and government actions."

BREACH ALLEGATIONS:
Beginning March 2020, GlobalSupply failed to meet delivery obligations, citing COVID-19
pandemic disruptions to their manufacturing facilities in Southeast Asia. TechCorp alleges:
1. GlobalSupply did not provide timely written notice of force majeure (notice given 45 days
   after first missed delivery, contract requires 15-day notice)
2. GlobalSupply failed to demonstrate adequate mitigation efforts
3. Alternative suppliers were available but GlobalSupply did not pursue them
4. GlobalSupply continued to fulfill orders for other clients during the same period

DAMAGES CLAIMED:
- Lost revenue from production delays: $2.3 million
- Cost of emergency procurement from alternative suppliers: $890,000
- Reputational damage from missed customer commitments: $500,000
- Total claimed damages: $3.69 million

DEFENDANT'S POSITION:
GlobalSupply argues:
1. COVID-19 constitutes a valid force majeure event
2. Government lockdowns in manufacturing countries made performance impossible
3. Notice delay was reasonable given the unprecedented nature of the pandemic
4. TechCorp failed to mitigate by not securing alternative suppliers earlier
5. Damages claimed are speculative and not adequately documented"""


class Command(BaseCommand):
    help = 'Seed the legal knowledge base with sample documents and create a sample case'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-rag',
            action='store_true',
            help='Skip seeding the RAG vector store (only create DB records)',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing sample data before seeding',
        )

    def handle(self, *args, **options):
        from legal_assistant.models import User, Client, Case, CaseTimeline

        self.stdout.write(self.style.NOTICE('Starting data seeding...'))

        # Create admin user if not exists
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@legalassistant.com',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
                'first_name': 'System',
                'last_name': 'Admin',
                'organization': 'AI Legal Assistant',
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('Created admin user (admin/admin123)'))

        # Create sample attorney
        attorney, created = User.objects.get_or_create(
            username='jsmith',
            defaults={
                'email': 'jsmith@lawfirm.com',
                'role': 'attorney',
                'first_name': 'John',
                'last_name': 'Smith',
                'organization': 'Smith & Associates',
                'bar_number': 'BAR-2024-001',
            }
        )
        if created:
            attorney.set_password('attorney123')
            attorney.save()
            self.stdout.write(self.style.SUCCESS('Created attorney user (jsmith/attorney123)'))

        # Create sample paralegal
        paralegal, created = User.objects.get_or_create(
            username='mjones',
            defaults={
                'email': 'mjones@lawfirm.com',
                'role': 'paralegal',
                'first_name': 'Mary',
                'last_name': 'Jones',
                'organization': 'Smith & Associates',
            }
        )
        if created:
            paralegal.set_password('paralegal123')
            paralegal.save()
            self.stdout.write(self.style.SUCCESS('Created paralegal user (mjones/paralegal123)'))

        # Create sample client
        client, _ = Client.objects.get_or_create(
            name='TechCorp Inc.',
            defaults={
                'email': 'legal@techcorp.com',
                'phone': '+1-555-0100',
                'address': '100 Technology Drive, San Jose, CA 95131',
                'organization': 'TechCorp Inc.',
                'notes': 'Major technology company, primary contact: Sarah Chen (General Counsel)',
                'created_by': attorney,
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Client: {client.name}'))

        # Create sample case
        case, case_created = Case.objects.get_or_create(
            case_number='CASE-2024-001',
            defaults={
                'title': 'TechCorp Inc. v. GlobalSupply Ltd. - Contract Dispute',
                'description': 'Breach of supply agreement due to alleged force majeure during COVID-19 pandemic.',
                'case_type': 'contract',
                'status': 'in_progress',
                'priority': 'high',
                'client': client,
                'assigned_to': attorney,
                'created_by': attorney,
                'court': 'U.S. District Court, Northern District of California',
                'judge': 'Hon. Patricia Martinez',
                'filing_date': '2024-03-15',
                'case_text': SAMPLE_CASE_TEXT,
                'tags': ['contract', 'force_majeure', 'supply_chain', 'covid-19'],
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Case: {case.case_number}'))

        # Create timeline events
        if case_created:
            timeline_events = [
                {
                    'event_type': 'filing',
                    'title': 'Case Filed',
                    'description': 'Initial complaint filed in federal court.',
                    'event_date': timezone.datetime(2024, 3, 15, tzinfo=timezone.utc),
                },
                {
                    'event_type': 'service',
                    'title': 'Defendant Served',
                    'description': 'GlobalSupply Ltd. served with complaint and summons.',
                    'event_date': timezone.datetime(2024, 3, 22, tzinfo=timezone.utc),
                },
                {
                    'event_type': 'response',
                    'title': 'Answer Filed',
                    'description': 'Defendant filed answer asserting force majeure defense.',
                    'event_date': timezone.datetime(2024, 4, 12, tzinfo=timezone.utc),
                },
                {
                    'event_type': 'discovery',
                    'title': 'Discovery Phase Begins',
                    'description': 'Parties begin exchanging documents and interrogatories.',
                    'event_date': timezone.datetime(2024, 5, 1, tzinfo=timezone.utc),
                },
                {
                    'event_type': 'hearing',
                    'title': 'Status Conference',
                    'description': 'Initial status conference with Judge Martinez.',
                    'event_date': timezone.datetime(2024, 6, 15, tzinfo=timezone.utc),
                },
            ]
            for event_data in timeline_events:
                CaseTimeline.objects.create(
                    case=case,
                    created_by=attorney,
                    **event_data,
                )
            self.stdout.write(
                self.style.SUCCESS(f'Created {len(timeline_events)} timeline events')
            )

        # Seed RAG knowledge base
        if not options['skip_rag']:
            self.stdout.write(self.style.NOTICE('Seeding RAG knowledge base...'))
            try:
                from legal_assistant.agents.rag import initialize_rag_with_documents

                vector_ids = initialize_rag_with_documents(LEGAL_KNOWLEDGE_BASE)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'RAG seeded with {len(vector_ids)} chunks from '
                        f'{len(LEGAL_KNOWLEDGE_BASE)} documents'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(
                        f'RAG seeding failed (ChromaDB may not be running): {e}'
                    )
                )
                self.stdout.write(
                    self.style.NOTICE('Run with --skip-rag to skip RAG seeding')
                )
        else:
            self.stdout.write(self.style.NOTICE('Skipped RAG seeding'))

        self.stdout.write(self.style.SUCCESS('\nData seeding completed successfully!'))
        self.stdout.write(self.style.NOTICE(
            '\nSample credentials:\n'
            '  Admin:     admin / admin123\n'
            '  Attorney:  jsmith / attorney123\n'
            '  Paralegal: mjones / paralegal123'
        ))
