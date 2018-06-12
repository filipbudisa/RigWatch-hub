import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RigComponent } from './rig.component';

describe('RigComponent', () => {
  let component: RigComponent;
  let fixture: ComponentFixture<RigComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RigComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
